import * as vscode from 'vscode'
import { buildWebview, getSelectedFunctions, lastFocusedPanel, registerWebviewPanelSerializer } from './webview'
import { getCyNodes, getNode } from './graph'

export const output = vscode.window.createOutputChannel('Chartographer-Extra')

const getDefaultProgressOptions = (title: string): vscode.ProgressOptions => {
    return {
        location: vscode.ProgressLocation.Notification,
        title,
        cancellable: true
    }
}

function findLongestCommonPrefix(strs: string[]): string {
    if (strs.length === 0) {
        return "";
    }

    // Sort the array to bring potentially common prefixes together
    strs.sort();

    const firstStr = strs[0];
    const lastStr = strs[strs.length - 1];
    let prefix = "";

    for (let i = 0; i < firstStr.length; i++) {
        if (firstStr.charAt(i) === lastStr.charAt(i)) {
            prefix += firstStr.charAt(i);
        } else {
            break;
        }
    }

    return prefix;
}

export function activate(context: vscode.ExtensionContext) {
    const roots = vscode.workspace.workspaceFolders?.map((f) => f.uri.toString()) ?? []
    const workspaceRoot = findLongestCommonPrefix(roots)

    registerWebviewPanelSerializer(context, workspaceRoot)

    const disposable = vscode.commands.registerCommand(
        'Chartographer-Extra.showCallGraph',
        async () => {
            vscode.window.withProgress(
                getDefaultProgressOptions('Generate call graph'),
                buildWebview(context, workspaceRoot, 'Both')
            )
        }
    )
    context.subscriptions.push(disposable)

    const incomingDisposable = vscode.commands.registerCommand(
        'Chartographer-Extra.showIncomingCallGraph',
        async () => {
            vscode.window.withProgress(
                getDefaultProgressOptions('Generate call graph'),
                buildWebview(context, workspaceRoot, 'Incoming')
            )
        }
    )
    context.subscriptions.push(incomingDisposable)

    const outgoingDisposable = vscode.commands.registerCommand(
        'Chartographer-Extra.showOutgoingCallGraph',
        async () => {
            vscode.window.withProgress(
                getDefaultProgressOptions('Generate call graph'),
                buildWebview(context, workspaceRoot, 'Outgoing')
            )
        }
    )
    context.subscriptions.push(outgoingDisposable)

    const addHierarchy = vscode.commands.registerCommand(
        'Chartographer-Extra.addHierarchy',
        async () => {
            const entries = await getSelectedFunctions()
            if (lastFocusedPanel) {
                lastFocusedPanel.addElems(
                    entries.flatMap((entry) => getCyNodes(getNode(workspaceRoot, entry)))
                )
            }
        }
    )
    context.subscriptions.push(addHierarchy)
}
