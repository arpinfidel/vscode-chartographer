import * as vscode from 'vscode'
import { CyNode, Element, getCyElems } from './graph'
import { getHtmlContent } from './html'
import { CallHierarchy, getCallHierarchy } from './call'
import { fileURLToPath } from 'url'

type State = {
    elems: Element[],
    
    title: string
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

        rootFile = entries[0].uri    
        rootFunction = entries[0].name
        
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
                        'Chartographer-Extra: failed to load previous state'
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



// Store the URI of the file containing the function for which graph was requested.
// Will be used to construct default file name for saving the graph as an image.
var rootFile: vscode.Uri 

// Store the name of the function for which graph was requested.
// Will be used to construct default file name for saving the graph as an image.
var rootFunction = ""

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
    
    // Try to compile graph title
    // TODO: Try to serialize this as the value can only be computed when first generating a graph
    const title = 
        (params && params?.entryPoints[0].uri && params?.entryPoints[0]) 
        ? 'Call graph for ' + params.entryPoints[0].uri.toString().replace(workspaceRoot.toString(), '').replace(/\//g, '-').substring(1) + '-' + params.entryPoints[0].name 
        : null;


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

            case 'savePNG':
                const data = msg.data; // The PNG data URL
                // Convert data URL to bytes
                const match = data.match(/^data:.+\/(.+);base64,(.*)$/);
                const buffer = Buffer.from(match[2], 'base64');
                
                var defaultFileName = ""

                // try {
                //     const relativeFileName = rootFile.toString().replace(workspaceRoot.toString(), '').replace(/\//g, '-').substring(1)                
                //     defaultFileName = `Call graph for ${relativeFileName}-${rootFunction}.png`;
                // } catch {
                //     defaultFileName = "Call graph"
                // }

                if (title) {
                    try {                    
                        defaultFileName = `${title}.png`;
                    } catch {
                        defaultFileName = "Call graph.png"
                    }
                } else {
                    defaultFileName = "Call graph.png"
                }
                
                // Prompt the user for a save location
                const uri = await vscode.window.showSaveDialog({
                    filters: {
                        'PNG images (*.png)': ['*.png'],
                        'All files (*.*)': ['*.*']
                    },
                    defaultUri: vscode.Uri.file(defaultFileName)
                });
                
                if (uri) {
                    // Use VS Code's filesystem API to write the file
                    await vscode.workspace.fs.writeFile(uri, buffer);
                    vscode.window.showInformationMessage('Graph saved as PNG.');
                }
        }
    }
    return { handler, html }
}
