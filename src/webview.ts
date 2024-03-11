import * as vscode from 'vscode'
import { CyNode, Element, getCyElems } from './graph'
import { getHtmlContent } from './html'
import { CallHierarchy, getCallHierarchy } from './call'

type State = {
    elems: Element[],
}

type Params = {
    direction: 'Incoming' | 'Outgoing' | 'Both',
    entryPoints: vscode.CallHierarchyItem[],
}

export const buildWebview = (
    context: vscode.ExtensionContext,
	workspaceRoot: string,
    direction: 'Incoming' | 'Outgoing' | 'Both',
) => {
    return async () => {
        const entries: vscode.CallHierarchyItem[] = await getSelectedFunctions()

        const webviewType = `Chartographer-Extra.previewCallGraph`
        const panel = vscode.window.createWebviewPanel(
            webviewType,
            `Chartographer-Extra Call Graph`,
            vscode.ViewColumn.Beside,
            {enableScripts: true}
        )
        
        const { handler, html } = setupCallGraph(context, workspaceRoot, panel, {direction, entryPoints: entries})

        panel.webview.onDidReceiveMessage(handler)
        panel.webview.html = html
    }
}

export const registerWebviewPanelSerializer = (
    context: vscode.ExtensionContext,
	workspaceRoot: string,
) => {
    vscode.window.registerWebviewPanelSerializer(`Chartographer-Extra.previewCallGraph`, 
        {
            async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
                if (!state) {
                    vscode.window.showErrorMessage(
                        'Chartographer-Extra: fail to load previous state'
                    )
                    return
                }

                const { handler, html } = setupCallGraph(context, workspaceRoot, webviewPanel, undefined, state)

                webviewPanel.webview.html = html
                webviewPanel.webview.onDidReceiveMessage(handler)
            }
        }
    )
}

export async function getSelectedFunctions() {
	const activeTextEditor = vscode.window.activeTextEditor!
	const entry: vscode.CallHierarchyItem[] = await vscode.commands.executeCommand(
		'vscode.prepareCallHierarchy',
		activeTextEditor.document.uri,
		activeTextEditor.selection.active
	)
	if (!entry || !entry[0]) {
		const msg = "Can't resolve entry function"
		vscode.window.showErrorMessage(msg)
		throw new Error(msg)
	}
	return entry
}

export let lastFocusedPanel: {
	panel: vscode.WebviewPanel,
	addElems: (elems: Element[]) => void,
	addEdge: (edge: CallHierarchy) => void,
} | undefined = undefined
export function setupCallGraph(
    context: vscode.ExtensionContext,
	workspaceRoot: string,
    panel: vscode.WebviewPanel,
    params?: Params,
    state?: State,
) {
    const html = getHtmlContent(context)
    const configs = vscode.workspace.getConfiguration('chartographer-extra')
    const config = {
        highlightRoots: configs.get<boolean>('highlightRoots'),
        highlightLeaves: configs.get<boolean>('highlightLeaves'),
        defaultGraphLayoutAlgorithm: configs.get<string>('defaultGraphLayoutAlgorithm'),
    }

	// panel.onDidChangeViewState((e) => {
	// 	if (panel.visible) {
	// 		lastFocusedPanel = panel
	// 	}
	// })

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
        const elems = getCyElems(workspaceRoot, edge)
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
                        lastFocusedPanel = {
							panel,
							addElems,
							addEdge,
						}
                        
                        if (params) {
							Promise.all(params.entryPoints.map(async (entry) => {
								await getCallHierarchy(params.direction, entry, addEdge)
							}))
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
                    node.data.character,
                    node.data.line,
                    node.data.character,
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
