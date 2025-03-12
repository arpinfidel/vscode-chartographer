# Chartographer

Initially based on [Call Graph](https://github.com/beicause/call-graph)

![chartographer](https://raw.githubusercontent.com/arpinfidel/vscode-chartographer/master/assets/call-graph.png)
vscode extension to generate call graph using [Cytoscape.js](https://js.cytoscape.org/) based on vscode call hierarchy language feature.

## Features

* works on any language with a language server
* show functions and methods grouped by file
* jump to function location on `Ctrl/Cmd+LClick`
* supports color themes
* ignore files configurably (test files, etc)
* `Alt+LClick` on a node to expand connections by one level
* `Alt+Shift+LClick` to recursively expand connections
* add a function to an existing graph
* Searching for a function

## Quick start

1. Move your editor cursor over a function name (LClick it)
2. Run `Chartographer: Show all call graph` command using `Ctrl+Shift+P` or context menu (RClick) to show calls
3. Run `Chartographer: Add function to existing graph` to add function to last opened graph
4. `Alt/Opt+LClick` on a node to fetch calls for that function

## Requirements

Chartographer relies on the "call hierarchy" feature of an LSP server. So, to use Chartographer for your project analysis, you must have a language server extension that supports "call hierarchy."

## Upcoming Features

* select multiple functions
* change graph layout algorithm on the fly
* dim test files
* group by directory configuration
* override colors configuration
* export as image

### For more information

* [GitHub](https://github.com/arpinfidel/vscode-chartographer)

**Enjoy!**
