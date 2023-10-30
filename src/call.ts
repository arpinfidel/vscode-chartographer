import { CallHierarchyItem } from 'vscode'
import * as vscode from 'vscode'
import { output } from './extension'
import { minimatch } from 'minimatch'
import EventEmitter = require('events')

export interface CallHierarchy {
    item: CallHierarchyItem
    from?: CallHierarchyItem
    to?: CallHierarchyItem
}

export async function getCallHierarchy(
    direction: 'Incoming' | 'Outgoing' | 'Both',
    root: CallHierarchyItem,
    addEdge: (edge: CallHierarchy) => void
) {
    if (direction === 'Both') {
        await getCallHierarchy('Incoming', root, addEdge)
        await getCallHierarchy('Outgoing', root, addEdge)
        return
    }

    console.log('root', root)

    const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.toString() ?? '';
    const configs = vscode.workspace.getConfiguration()
    const ignoreGlobs = configs.get<string[]>('chartographer.ignoreOnGenerate') ?? []
    const ignoreNonWorkspaceFiles = configs.get<boolean>('chartographer.ignoreNonWorkspaceFiles') ?? false

    const command = direction === 'Outgoing' ? 'vscode.provideOutgoingCalls' : 'vscode.provideIncomingCalls'
    const visited: { [key: string]: boolean } = {};

    const traverse = async (node: CallHierarchyItem) => {
        output.appendLine('resolve: ' + node.name)
        const uri = node.uri.toString().replace(workspaceRoot, '')
        const id  = `"${uri}#${node.name}@${node.range.start.line}:${node.range.start.character}"`

        if (visited[id]) return
        visited[id] = true

        const calls:
            | vscode.CallHierarchyOutgoingCall[]
            | vscode.CallHierarchyIncomingCall[] = await vscode.commands.executeCommand(command, node)

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
            if (skip) return

            addEdge(edge)
            await traverse(next)
        }))
    }

    await traverse(root)
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
