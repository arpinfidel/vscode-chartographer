# Chartographer

A fork of [Call Graph](https://github.com/beicause/call-graph)

![chartographer](https://raw.githubusercontent.com/arpinfidel/vscode-chartographer/master/assets/call-graph.png)
vscode extension to generate call graph using [Cytoscape.js](https://js.cytoscape.org/) based on vscode call hierarchy language feature.

## Features

* generate call graph in a separate panel
* jump to function location on click
* supports color themes

## Quick start
1. Open your folder and select a entry function
2. Run `Chartographer.showOutgoingCallGraph` command using `Ctrl+Shift+P` or context menu to show outgoing calls
3. Or Run `Chartographer.showIncomingCallGraph` command using `Ctrl+Shift+P` or context menu to show incoming calls

## How it works
It utilizes the builtin `vscode.provideOutgoingCalls` and `vscode.provideIncomingCalls` commands.

## To-Do

* exclude files configuration
* highlight source and sink nodes configuration
* dim test files configuration
* group by directory configuration
* override colors configuration
* generate dot file

### For more information
* [GitHub](https://github.com/arpinfidel/vscode-chartographer)

**Enjoy!**
