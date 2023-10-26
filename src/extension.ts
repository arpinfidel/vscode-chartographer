import * as vscode from 'vscode'
import {
    CallHierarchy,
    getCallNode,
} from './call'
import { CyNode, generateGraph as generateGraph } from './graph'
import { getHtmlContent } from './html'
import * as path from 'path'
import * as fs from 'fs'
import * as pm from 'picomatch'
import { Elements } from './graph'

export const output = vscode.window.createOutputChannel('Chartographer')

const getDefaultProgressOptions = (title: string): vscode.ProgressOptions => {
    return {
        location: vscode.ProgressLocation.Notification,
        title,
        cancellable: true
    }
}

const buildWebview = (
    direction: 'Incoming' | 'Outgoing',
    callNodeFunction: (direction: 'Incoming' | 'Outgoing', root: vscode.CallHierarchyItem) => Promise<CallHierarchy[]>,
    onReceiveMsg: (msg: any) => void
) => {
    return async () => {
        const activeTextEditor = vscode.window.activeTextEditor!
        const entry: vscode.CallHierarchyItem[] =
            await vscode.commands.executeCommand(
                'vscode.prepareCallHierarchy',
                activeTextEditor.document.uri,
                activeTextEditor.selection.active
            )
        if (!entry || !entry[0]) {
            const msg = "Can't resolve entry function"
            vscode.window.showErrorMessage(msg)
            throw new Error(msg)
        }
        const workspace = vscode.workspace.workspaceFolders?.[0].uri!
        const graph = await callNodeFunction(direction, entry[0])

        const elems = generateGraph(graph)

        const nodes: { [key: string]: CyNode } = {}
        for (const node of elems.nodes) {
            nodes[node.data.id] = node
        }

        const webviewType = `Chartographer.previewCallGraph`
        const panel = vscode.window.createWebviewPanel(
            webviewType,
            `Chartographer ${direction}`,
            vscode.ViewColumn.Beside,
            {enableScripts: true}
        )
        panel.webview.html = getHtmlContent(elems)

        panel.webview.onDidReceiveMessage((msg:any) => {
            if (msg.type === 'goToFunction') {
                const node = nodes[msg.data]
                if (!node) return
    
                const range = new vscode.Range(
                    node.data.line,
                    0,
                    node.data.line,
                    0
                )
                vscode.window.showTextDocument(node.data.uri, {
                    selection: range,
                    preview: true,
                    viewColumn: vscode.ViewColumn.One,
                })
            }
        })
    }
}
const registerWebviewPanelSerializer = (
    webViewType: string,
    onReceiveMsg: (msg: any) => void
) => {
    vscode.window.registerWebviewPanelSerializer(webViewType, 
        {
            async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
                console.log('state', state)
                if (!state) {
                    vscode.window.showErrorMessage(
                        'Chartographer: fail to load previous state'
                    )
                    return
                }
                webviewPanel.webview.html = getHtmlContent(state)
                webviewPanel.webview.onDidReceiveMessage(onReceiveMsg)
            }
        }
    )
}

export function activate(context: vscode.ExtensionContext) {
    // TODO: use this
    const onReceiveMsg = (msg: any) => {
    }
    const incomingDisposable = vscode.commands.registerCommand(
        'Chartographer.showIncomingCallGraph',
        async () => {
            vscode.window.withProgress(
                getDefaultProgressOptions('Generate call graph'),
                buildWebview('Incoming', getCallNode, onReceiveMsg)
            )
        }
    )
    const outgoingDisposable = vscode.commands.registerCommand(
        'Chartographer.showOutgoingCallGraph',
        async () => {
            vscode.window.withProgress(
                getDefaultProgressOptions('Generate call graph'),
                buildWebview('Outgoing', getCallNode, onReceiveMsg)
            )
        }
    )
    registerWebviewPanelSerializer(
        `Chartographer.previewCallGraph`,
        onReceiveMsg
    )
    context.subscriptions.push(incomingDisposable)
    context.subscriptions.push(outgoingDisposable)
}
