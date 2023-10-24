# Chartographer

A fork of [Call Graph](https://github.com/beicause/call-graph)

![chartographer](https://raw.githubusercontent.com/arpinfidel/vscode-chartographer/master/assets/call-graph.png)
vscode extension to generate call graph using [Cytoscape.js](https://js.cytoscape.org/) based on vscode call hierarchy language feature.

## Features

* show functions and methods grouped by file
* display function calls and interface implementations
* jump to function location on ctrl/cmd + click
* click on function to highlight connections
* supports color themes

## Quick start

1. Open your folder and select a entry function
2. Run `Chartographer: Show incoming call graph` command using `Ctrl+Shift+P` or context menu to show outgoing calls
3. Or run `Chartographer: Show incoming call graph`

## Requirements

Chartographer relies on the "call hierarchy" feature of an LSP server. So, to use Chartographer for your project analysis, you must have a language server extension that supports "call hierarchy."

## Upcoming Features

* exclude files configuration
* highlight source and sink nodes configuration
* graph layout options
* highlight connected nodes on click
* support highlight based on node group (file)
* show both incoming and outgoing calls
* dim test files configuration
* group by directory configuration
* override colors configuration
* generate dot file

### For more information

* [GitHub](https://github.com/arpinfidel/vscode-chartographer)

**Enjoy!**
