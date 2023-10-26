import { CallHierarchyItem } from 'vscode'
import * as vscode from 'vscode'
import { output } from './extension'
import { minimatch } from 'minimatch'

export interface CallHierarchy {
    item: CallHierarchyItem
    from?: CallHierarchyItem
    to?: CallHierarchyItem
}

export async function getCallNode(
    direction: 'Incoming' | 'Outgoing',
    root: CallHierarchyItem,
) {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.toString() ?? '';
    const command = direction === 'Outgoing' ? 'vscode.provideOutgoingCalls' : 'vscode.provideIncomingCalls'
    const visited: { [key: string]: boolean } = {};
    const edges = [] as CallHierarchy[]
    const ignoreGlobs = vscode.workspace.getConfiguration().get<string[]>('chartographer.ignoreOnGenerate') ?? []
    console.log('globs', ignoreGlobs)

    const insertNode = async (node: CallHierarchyItem) => {
        output.appendLine('resolve: ' + node.name)
        const uri = node.uri.toString().replace(workspaceRoot, '')
        const id  = `"${uri}#${node.name}@${node.range.start.line}:${node.range.start.character}"`

        if (visited[id]) return
        visited[id] = true

        const calls:
            | vscode.CallHierarchyOutgoingCall[]
            | vscode.CallHierarchyIncomingCall[] = await vscode.commands.executeCommand(command, node)

        for (const call of calls) {
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
                console.log('glob', glob, next.uri.fsPath, minimatch(next.uri.fsPath, glob))
                if (minimatch(next.uri.fsPath, glob)) {
                    skip = true
                    break
                }
            }
            if (skip) continue

            edges.push(edge)
            await insertNode(next)
        }
    }

    await insertNode(root)
    
    return edges
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
