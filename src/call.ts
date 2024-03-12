import { CallHierarchyItem } from 'vscode'
import * as vscode from 'vscode'
import { output } from './extension'
import { minimatch } from 'minimatch'
import EventEmitter = require('events')

export interface CallHierarchy {
    item: CallHierarchyItem
    from?: CallHierarchyItem
    to?: CallHierarchyItem

    sequenceNumber?: string
}

export async function getCallHierarchy(
        direction: 'Incoming' | 'Outgoing' | 'Both',
        root: CallHierarchyItem,
        parentSequenceNumber: string,
        addEdge: (edge: CallHierarchy) => void
    ) 
{
    if (direction === 'Both') {
        await getCallHierarchy('Incoming', root, parentSequenceNumber, addEdge)
        await getCallHierarchy('Outgoing', root, parentSequenceNumber, addEdge)
        return
    }

    const configs = vscode.workspace.getConfiguration()
    const ignoreGlobs = configs.get<string[]>('chartographer-extra.ignoreOnGenerate') ?? []
    const ignoreNonWorkspaceFiles = configs.get<boolean>('chartographer-extra.ignoreNonWorkspaceFiles') ?? false

    // Let the user choose to omit calls of functions in 3rd party and built-in packages
    const ignoreAnalyzingThirdPartyPackages = configs.get<boolean>('chartographer-extra.ignoreAnalyzingThirdPartyPackages') ?? false

    // ----------------------------------------------------------------------------------------------------------------------------
    // Gather potential venv paths and other paths that may contain 3rd party packages 
    // (to optionally exclude their calls from the graph)

    // Two default paths offered by VS Code when creating a virtual environment
    const dotVenv = ".venv";
    const dotConda = ".conda";

    // Start building paths to exclude by adding the default ones
    let builtinPackagesPaths: string[] = [dotVenv, dotConda];

    const pythonSettings = vscode.workspace.getConfiguration('python');    
    
    if (pythonSettings) {
        
        // Check if Python path is set and add it to the list of paths to exclude
        const pyPath = pythonSettings.get('pythonPath');     
        if (pyPath && typeof pyPath === 'string') {
            builtinPackagesPaths.push(pyPath.toString())
        }

        // Check if 'Python: Venv folders' are specified, and add each to the list of paths to exclude
        const venvFolders = pythonSettings.get<string[]>('venvFolders') ?? [];
        for (const folder of venvFolders ?? []) {        
            builtinPackagesPaths.push(folder)
        }

        // Check if 'Python: Venv Path' is defined and add it to the list of paths to exclude
        const venvPath = pythonSettings.get('venvPath');     
        if (venvPath && typeof venvPath === 'string') {
            // Be prepared users may list multiple paths separated by comma or semicolon
            for (const pathItem of venvPath.toString().split(/[;,]/)) {
                builtinPackagesPaths.push(pathItem)
            }
            
        }        
    }

    const command = direction === 'Outgoing' ? 'vscode.provideOutgoingCalls' : 'vscode.provideIncomingCalls'
    const visited: { [key: string]: boolean } = {};
    
    var edgeSequenceNumber: string;

    const traverse = async (node: CallHierarchyItem, parentSequenceNumber: string) => {
        output.appendLine('resolve: ' + node.name)
        const id  = `"${node.uri}#${node.name}@${node.range.start.line}:${node.range.start.character}"`

        if (visited[id]) return
        visited[id] = true

        const calls:
            | vscode.CallHierarchyOutgoingCall[]
            | vscode.CallHierarchyIncomingCall[] = await vscode.commands.executeCommand(command, node)

        var localSequenceNumberIx: number = 0;
            
        await Promise.all(calls.map(async (call) => {
            let next: CallHierarchyItem
            let edge: CallHierarchy
            
            
            
            if (call instanceof vscode.CallHierarchyOutgoingCall) {
                edge = { item: node, to: call.to }
                next = call.to
            } else {
                edge = { item: node, from: call.from }
                next = call.from
            }

            let skip = false
            for (const glob of ignoreGlobs) {
                if (minimatch(next.uri.fsPath, glob)) {
                    skip = true
                    break
                }
            }
            if (ignoreNonWorkspaceFiles) {
                let isInWorkspace = false
                for (const workspace of vscode.workspace.workspaceFolders ?? []) {
                    if (next.uri.fsPath.startsWith(workspace.uri.fsPath)) {
                        isInWorkspace = true
                        break
                    }
                }
                if (!isInWorkspace) {
                    skip = true
                }
            }

            if (ignoreAnalyzingThirdPartyPackages) { // don't follow functions in files located under venv directories

                let isInVenv = false
                for (const path of builtinPackagesPaths ?? []) {
                    if (next.uri.fsPath.includes(path)) {
                        isInVenv = true
                        break
                    }
                }
                if (isInVenv) {
                    skip = true
                }
            }

            if (skip) return

            localSequenceNumberIx++;
            var edgeSequenceNumber = `${parentSequenceNumber}.${localSequenceNumberIx.toString()}`;
            
            if (call instanceof vscode.CallHierarchyOutgoingCall) {
                edgeSequenceNumber = 
                    (parentSequenceNumber === "") 
                    ? `${localSequenceNumberIx.toString()}` 
                    : `${parentSequenceNumber}.${localSequenceNumberIx.toString()}`;
            } else {
                edgeSequenceNumber = 
                    (parentSequenceNumber === "") 
                    ? `\u21A3 ${localSequenceNumberIx.toString()}` 
                    : parentSequenceNumber.startsWith('\u21A3') 
                        ? `${localSequenceNumberIx.toString()} ${parentSequenceNumber}`
                        : `${localSequenceNumberIx.toString()} \u21A3 ${parentSequenceNumber}`;
            }

            edge.sequenceNumber = edgeSequenceNumber

            addEdge(edge)
            await traverse(next, edgeSequenceNumber)
        }))
    }

    await traverse(root, "")
}

function isEqual(a: CallHierarchyItem, b: CallHierarchyItem) {
    return (
        a.name === b.name &&
        a.kind === b.kind &&
        a.uri.toString() === b.uri.toString() &&
        a.range.start.line === b.range.start.line &&
        a.range.start.character === b.range.start.character
    )
}
