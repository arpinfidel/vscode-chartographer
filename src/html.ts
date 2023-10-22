import { Elements } from './graph'
import * as vscode from 'vscode'

export function getHtmlContent(elems:Elements){
    const elemsStr = JSON.stringify(elems)

    const color = (n: string) => {
        const col = new vscode.ThemeColor(n)
        return col
    }

    const html = `
    <!DOCTYPE html>
        <html>
        <head>
            <title>Cytoscape.js Directed Graph Example</title>
            <style>
                #cy {
                    height: 500px;
                    width: 100%;
                    display: block;
                }
            </style>
        </head>
        <body>
            <div id="cy" style="height:100vh"></div>

            <!-- Include Cytoscape.js and Cytoscape Klay layout libraries from CDNs -->
            <script src="https://unpkg.com/cytoscape/dist/cytoscape.min.js"></script>
            <script src="https://unpkg.com/klayjs@0.4.1/klay.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/cytoscape-klay@3.1.3/cytoscape-klay.min.js"></script>

            <script>
                document.addEventListener('DOMContentLoaded', function(){
                    const layoutOpts = {
                        name: 'klay',
                        animate: true,
                        animationDuration: 100,
                        klay: {
                            addUnnecessaryBendpoints: false,
                            direction: 'RIGHT',
                            layoutHierarchy: true,
                            spacing: 40,
                            compactComponents: true,
                            spacing: 5,
                            thoroughness: 10,
                            edgeSpacingFactor: 0.5,
                            inLayerSpacingFactor: 2,
                        }
                    }

                    // const elem = document.querySelector('');
                    const elem = document.body;
	                const style = getComputedStyle(elem);
                    const getStyle = (name) => style.getPropertyValue(name);
                    // const getStyle = (name) => 'rgb(255, 255, 255)';

                    // Initialize Cytoscape.js
                    var cy = cytoscape({
                        container: document.getElementById('cy'),
                        style: [
                            {
                                selector: 'node',
                                style: {
                                    'font-size': '12px',
                                    'background-color': getStyle('--vscode-menu-background'),
                                    'color': getStyle('--vscode-menu-foreground'),
                                    'width': 'label',
                                    'padding': '5px',
                                    'border-color': getStyle('--vscode-editor-foreground'),
                                    'border-width': 1,
                                    'shape': 'roundrectangle',
                                    'label': 'data(label)',
                                    'text-halign': 'center',  // Horizontally center the label
                                    'text-valign': 'center',  // Vertically center the label
                                }
                            },
                            {
                                selector: 'edge',
                                style: {
                                    'curve-style': 'unbundled-bezier',
                                    'target-arrow-shape': 'triangle',
                                    'line-color': getStyle('--vscode-editor-foreground'),
                                    'target-arrow-color': getStyle('--vscode-editor-foreground'),
                                    'opacity': 0.5,
                                }
                            },
                            {
                                selector: '.compound',
                                style: {
                                    'font-size': '10px',
                                    'padding-top': 25,
                                    'background-color': getStyle('--vscode-editor-background'),
                                    'shape': 'roundrectangle',
                                    'label': 'data(label)',
                                    
                                    'text-valign': 'top',
                                    'text-halign': 'center',
                                    'text-margin-y': 15,
                                }
                            }
                        ],
                        elements: ${elemsStr},
                        layout: layoutOpts,
                    });

                    const vscode = acquireVsCodeApi();

                    // Apply the layout to the graph
                    cy.layout(layoutOpts).run();

                    cy.nodes().on('click', function(e){
                        var clickedNode = e.target;
                        console.log(clickedNode.id());
                        vscode.postMessage(clickedNode.id())
                    });
                });
            </script>
        </body>
        </html>`
        // https://js.cytoscape.org/#style/labels

    return html
}