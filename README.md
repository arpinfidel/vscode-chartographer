# Chartographer-Extra

A fork of [Call Graph](https://github.com/beicause/call-graph)

![chartographer](https://github.com/gusztavj/vscode-chartographer-improved/master/assets/call-graph.png)
vscode extension to generate call graph using [Cytoscape.js](https://js.cytoscape.org/) based on vscode call hierarchy language feature.

## Features

* show functions and methods grouped by file
* display function calls and interface implementations
* jump to function location on `Ctrl/Cmd+LClick`
* click on function to highlight connections
* supports color themes
* ignore files configurably (test files, etc)
* `Alt+LClick` on a function to fetch connections
* add a function to an existing graph through `Ctrl+Shift+P`

## Quick start

1. Move your editor cursor over a function name
2. Run `Chartographer-Extra: Show call graph` command using `Ctrl+Shift+P` or context menu to show calls
3. Run `Chartographer-Extra: Add function to existing graph` to add function to last opened graph
4. `Alt+LClick` on a node to fetch calls for that function

## Requirements

Chartographer-Extra relies on the "call hierarchy" feature of an LSP server. So, to use Chartographer-Extra for your project analysis, you must have a language server extension that supports "call hierarchy."

## Upcoming Features

* select multiple functions
* change graph layout algorithm on the fly
* dim test files
* group by directory configuration
* override colors configuration
* export as image

### For more information

* [GitHub](https://github.com/gusztavj/vscode-chartographer-improved)

**Enjoy!**
