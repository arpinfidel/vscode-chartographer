import { Elements } from './graph'
import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'


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
            <title>Chartographer</title>
            <style>
                #cy {
                    height: 500px;
                    width: 100%;
                    display: block;
                    z-index: 10;
                }

                #instructions {
                    position: absolute;
                    top: 10px;
                    left: 10px;
                    background-color: rgba(0, 0, 0, 0.3);
                    color: rgba(255, 255, 255, 0.5);
                    padding: 10px;
                    border-radius: 5px;
                    font-size: 10px;
                    line-height: 1;
                    z-index: 20;
                }
                
                #hide-text {
                    text-align: center;
                    color: rgba(255, 255, 255, 0.5); /* Darkened text color */
                    font-size: 8px;
                    text-decoration: underline; /* Underline the text */
                    margin-top: 5px; /* Add some top margin for spacing */
                }

                #question-mark {
                    position: absolute;
                    top: 10px;
                    left: 10px;
                    cursor: pointer;
                    font-size: 20px;
                    z-index: 20;
                }
        
                #question-mark:hover {
                    text-decoration: underline;
                }
            </style>
        </head>
        <body>
            <script>
                // Function to toggle the visibility of instructions
                function toggleInstructions() {
                    var instructions = document.getElementById("instructions");
                    var question = document.getElementById("question-mark");
                    if (instructions.style.display === "none" || instructions.style.display === "") {
                        instructions.style.display = "block";
                        question.style.display = "none";
                    } else {
                        instructions.style.display = "none";
                        question.style.display = "block";
                    }
                }
            </script>

            <!-- Question Mark Button -->
            <div id="question-mark" onclick="toggleInstructions()">&#63;</div>

            <!-- Instructions (Initially hidden) -->
            <div id="instructions" style="display: none;" onclick="toggleInstructions()">
                <p>Ctrl/Cmd + Left Click to go to function</p>
                <p>Left Click to highlight connections</p>
                <p>Left Click and drag to pan</p>
                <p>Scroll to zoom</p>
                <div id="hide-text">Click to hide</div>
            </div>

            <div id="cy" style="height:100vh"></div>

            <!-- Include Cytoscape.js and Cytoscape Klay layout libraries from CDNs -->
            <script src="https://unpkg.com/cytoscape/dist/cytoscape.min.js"></script>
            <script src="https://unpkg.com/klayjs@0.4.1/klay.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/cytoscape-klay@3.1.3/cytoscape-klay.min.js"></script>

            <script>
                const isMac = navigator.platform.toUpperCase().indexOf('MAC')>=0;
                const elems = ${elemsStr}
                const vscode = acquireVsCodeApi();

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

                const onLoad = function() {
                    const style = getComputedStyle(document.body);
                    const getStyle = (name) => style.getPropertyValue(name);
                    const cyStyle= [
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
                                'text-halign': 'center',
                                'text-valign': 'center',
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
                            selector: '.dimmedEdge',
                            style: {
                                'opacity': 0.2,
                            }
                        },
                        {
                            selector: '.highlightedEdge',
                            style: {
                                'opacity': 1,
                            }
                        },
                    ]

                    // Initialize Cytoscape.js
                    var cy = cytoscape({
                        container: document.getElementById('cy'),
                        style: cyStyle,
                        elements: elems,
                        layout: layoutOpts,
                    });

                    // Apply the layout to the graph
                    cy.layout(layoutOpts).run();

                    cy.on('tap', function(e) {
                        for (const edge of elems.edges) {
                            cy.$id(edge.data.id).removeClass(['dimmedEdge', 'highlightedEdge']);
                        }
                    })

                    cy.on('tap', 'node', function(e){
                        const node = e.target
                        const isCtrlDown = (e) => {
                            if (isMac && e.originalEvent.metaKey) {
                                return true
                            }
                            if (!isMac && e.originalEvent.ctrlKey) {
                                return true
                            }
                            return false
                        }

                        // console.log(e.originalEvent.metaKey);
                        // console.log(e.originalEvent.shiftKey);

                        if (isCtrlDown(e)) {
                            vscode.postMessage({
                                type: 'goToFunction',
                                data: node.id(),
                            })
                            return
                        }
                        
                        if (!node.isDimmed) {
                            node.isDimmed = true
                            
                            for (const edge of elems.edges) {
                                cy.$id(edge.data.id).classes('dimmedEdge');
                            }
    
                            for (const elem of node.connectedEdges()) {
                                console.log('connected', elem)
                                elem.classes('highlightedEdge')
                            }
                        } else {
                            node.isDimmed = false

                            for (const edge of elems.edges) {
                                cy.$id(edge.data.id).removeClass(['dimmedEdge', 'highlightedEdge']);
                            }
                        }
                    });
                }

                document.addEventListener('DOMContentLoaded', onLoad);
            </script>
        </body>
        </html>`
        // https://js.cytoscape.org/#style/labels

    return html
}