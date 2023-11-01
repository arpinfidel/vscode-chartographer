import * as vscode from 'vscode'
import {
    CallHierarchy,
    getCallHierarchy,
} from './call'
import { CyNode, Element, generateGraph as generateGraph } from './graph'
import { getHtmlContent } from './html'
import * as path from 'path'
import * as fs from 'fs'
import EventEmitter = require('events')

export const output = vscode.window.createOutputChannel('Chartographer')

const getDefaultProgressOptions = (title: string): vscode.ProgressOptions => {
    return {
        location: vscode.ProgressLocation.Notification,
        title,
        cancellable: true
    }
}

type State = {
    elems: Element[],
}

type Params = {
    direction: 'Incoming' | 'Outgoing' | 'Both',
    entryPoint: vscode.CallHierarchyItem,
}

const buildWebview = (
    context: vscode.ExtensionContext,
    direction: 'Incoming' | 'Outgoing' | 'Both',
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

        const webviewType = `Chartographer.previewCallGraph`
        const panel = vscode.window.createWebviewPanel(
            webviewType,
            `Chartographer Call Graph`,
            vscode.ViewColumn.Beside,
            {enableScripts: true}
        )
        
        const { handler, html } = setupCallGraph(context, panel, {direction, entryPoint: entry[0]})

        panel.webview.onDidReceiveMessage(handler)
        panel.webview.html = html
    }
}

const registerWebviewPanelSerializer = (
    context: vscode.ExtensionContext,
) => {
    vscode.window.registerWebviewPanelSerializer(`Chartographer.previewCallGraph`, 
        {
            async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
                if (!state) {
                    vscode.window.showErrorMessage(
                        'Chartographer: fail to load previous state'
                    )
                    return
                }

                const { handler, html } = setupCallGraph(context, webviewPanel, undefined, state)

                webviewPanel.webview.html = html
                webviewPanel.webview.onDidReceiveMessage(handler)
            }
        }
    )
}

function setupCallGraph(
    context: vscode.ExtensionContext,
    panel: vscode.WebviewPanel,
    params?: Params,
    state?: State,
) {
    const html = getHtmlContent(context)
    const configs = vscode.workspace.getConfiguration('chartographer')
    const config = {
        highlightRoots: configs.get<boolean>('highlightRoots'),
        highlightLeaves: configs.get<boolean>('highlightLeaves'),
        defaultGraphLayoutAlgorithm: configs.get<string>('defaultGraphLayoutAlgorithm'),
    }

    const nodes: { [key: string]: Element}  = {}
    const addElems = (elems: Element[]) => {
        for (const node of elems) {
            if (nodes[node.data.id]) continue
            nodes[node.data.id] = node
        }
        panel.webview.postMessage({
            type: 'addElems',
            data: elems,
        })
    }
    const addEdge = (edge: CallHierarchy) => {
        const elems = generateGraph(edge)
        addElems(elems)
    }

    const handler = async (msg: any) => {
        switch (msg.type) {
            case 'state':
                switch (msg.data) {
                    case 'loaded':
                        panel.webview.postMessage({
                            type: 'setParams',
                            data: {
                                config,
                            },
                        })
                    case 'ready':
                        if (params) {
                            await getCallHierarchy(params.direction, params.entryPoint, addEdge)
                        }
                        if (state) {
                            for (const node of state.elems) {
                                if (nodes[node.data.id]) continue
                                nodes[node.data.id] = node
                            }
                            panel.webview.postMessage({
                                type: 'addElems',
                                data: state.elems,
                            })
                        }
                }

            case 'goToFunction':
                const node = nodes[msg.data] as CyNode
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
            
            case 'expandBoth':
                // const uri = vscode.Uri.file(msg.data.uri.fsPath)
                const position = new vscode.Position(msg.data.line, msg.data.character)
                const item: vscode.CallHierarchyItem[] =
                    await vscode.commands.executeCommand(
                        'vscode.prepareCallHierarchy',
                        vscode.Uri.parse(msg.data.uri.external),
                        position,
                    )
                if (!item || !item[0]) {
                    const msg = "Can't resolve entry function"
                    vscode.window.showErrorMessage(msg)
                    throw new Error(msg)
                }

                await getCallHierarchy('Both', item[0], addEdge)
        }
    }
    return { handler, html }
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
                buildWebview(context, 'Incoming')
            )
        }
    )
    const outgoingDisposable = vscode.commands.registerCommand(
        'Chartographer.showOutgoingCallGraph',
        async () => {
            vscode.window.withProgress(
                getDefaultProgressOptions('Generate call graph'),
                buildWebview(context, 'Outgoing')
            )
        }
    )
    const disposable = vscode.commands.registerCommand(
        'Chartographer.showCallGraph',
        async () => {
            vscode.window.withProgress(
                getDefaultProgressOptions('Generate call graph'),
                buildWebview(context, 'Both')
            )
        }
    )
    
    registerWebviewPanelSerializer(context)

    context.subscriptions.push(incomingDisposable)
    context.subscriptions.push(outgoingDisposable)
    context.subscriptions.push(disposable)
}
