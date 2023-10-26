import { CallHierarchy } from "./call"
import * as vscode from 'vscode'

function findLongestCommonPrefix(strs: string[]): string {
    if (strs.length === 0) {
        return "";
    }

    // Sort the array to bring potentially common prefixes together
    strs.sort();

    const firstStr = strs[0];
    const lastStr = strs[strs.length - 1];
    let prefix = "";

    for (let i = 0; i < firstStr.length; i++) {
        if (firstStr.charAt(i) === lastStr.charAt(i)) {
            prefix += firstStr.charAt(i);
        } else {
            break;
        }
    }

    return prefix;
}


export function generateGraph(graph: CallHierarchy[]) {
    const roots = vscode.workspace.workspaceFolders?.map((f) => f.uri.toString()) ?? []
    const root = findLongestCommonPrefix(roots)


    // Define a function to create a node for a CallHierarchy.
    const getNode = (n: vscode.CallHierarchyItem) => {
        // Create a node with a name based on the URI, item name, and range.
        const uri = n.uri.toString().replace(root, '')
        return {
            id: `"${uri}#${n.name}@${n.range.start.line}:${n.range.start.character}"`,
            name: n.name,
            file: uri,
            uri: n.uri,
            line: n.range.start.line //`${n.range.start.line}:${n.range.start.character}`,
        } as Node;
    }

    const elems: Elements = {
        nodes: [],
        edges: [],
    };

    const nodes: { [key: string]: boolean } = {};
    const files: { [key: string]: boolean } = {};

    // Define a function to insert a node and its children into the graph.
    const insertNode = (n: Node) => {
        if (nodes[n.id]) return;

        nodes[n.id] = true;

        elems.nodes.push({
            data: {
                id: n.id,
                label: n.name,
                parent: n.file,
                uri: n.uri,
                line: n.line,
            }
        })

        if (!files[n.file]) {
            files[n.file] = true;

            elems.nodes.push({
                data: {
                    id: n.file,
                    label: n.file,
                    uri: n.uri,
                    line: 0,
                },
                classes: 'compound'
            })
        }
        
    }

    // Iterate through the children of the CallHierarchy.
    for (const edge of graph) {
        const node = getNode(edge.item);
        insertNode(node);
        
        if (edge.from) {
            const from = getNode(edge.from);
            insertNode(from);
            elems.edges.push({
                data: {
                    id: `edge:${from.id}:${node.id}`,
                    source: from.id,
                    target: node.id,
                }
            })
        } else if (edge.to) {
            const to = getNode(edge.to);
            insertNode(to);
            elems.edges.push({
                data: {
                    id: `edge:${node.id}:${to.id}`,
                    source: node.id,
                    target: to.id,
                }
            })
        }
    }


    // Return the generated graph.
    return elems;
}


export type CyNode = {
    data: {
        id: string;
        label: string;
        parent?: string;
        uri: vscode.Uri;
        line: number;
    };
    classes?: string;
};

export type CyEdge = {
    data: {
        id: string;
        source: string;
        target: string;
    };
};

export type Elements = {
    nodes: CyNode[];
    edges: CyEdge[];
};


export type Node = {
    id: string
    name: string,
    file: string,
    uri: vscode.Uri,
    line: number,
}
