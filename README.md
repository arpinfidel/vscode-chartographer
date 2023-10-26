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
* ignore files (test files, etc)

## Quick start

1. Move your editor cursor over a function name
2. Run `Chartographer: Show outgoing call graph` command using `Ctrl+Shift+P` or context menu to show outgoing calls
3. Or run `Chartographer: Show incoming call graph`

## Requirements

Chartographer relies on the "call hierarchy" feature of an LSP server. So, to use Chartographer for your project analysis, you must have a language server extension that supports "call hierarchy."

## Upcoming Features

* select multiple functions
* highlight source and sink nodes configuration
* support highlight based on node group (file)
* show both incoming and outgoing calls
* fetch additional connections on existing graph
* graph layout options
* dim test files
* group by directory configuration
* override colors configuration
* generate dot file

### For more information

* [GitHub](https://github.com/arpinfidel/vscode-chartographer)

**Enjoy!**
