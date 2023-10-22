import { CallHierarchyNode } from "./call"
import * as vscode from 'vscode'

export function generateDot(type: 'Incoming' | 'Outgoing', graph: CallHierarchyNode) {
    // Get the root folder of the workspace or an empty string if not available.
    const root = vscode.workspace.workspaceFolders?.[0].uri.toString() ?? '';

    // Define a function to create a node for a CallHierarchyNode.
    const getNode = (n: CallHierarchyNode) => {
        // Create a node with a name based on the URI, item name, and range.
        const uri = n.item.uri.toString().replace(root, '')
        return {
            id: `"${uri}#${n.item.name}@${n.item.range.start.line}:${n.item.range.start.character}"`,
            name: n.item.name,
            file: uri,
            uri: n.item.uri,
            line: n.item.range.start.line //`${n.item.range.start.line}:${n.item.range.start.character}`,
        } as Node;
    }

    // Create the root node.
    const node = getNode(graph);

    const elems: Elements = {
        nodes: [],
        edges: [],
    };

    const nodes: { [key: string]: boolean } = {};
    const files: { [key: string]: boolean } = {};

    // Define a function to insert a node and its children into the graph.
    const insertNode = (n: Node, c: CallHierarchyNode) => {
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
        

        // Iterate through the children of the CallHierarchyNode.
        for (const child of c.children) {
            const next = getNode(child);
            
            if (type === 'Incoming') {
                elems.edges.push({
                    data: {
                        source: next.id,
                        target: n.id,
                    }
                })
            } else {
                elems.edges.push({
                    data: {
                        source: n.id,
                        target: next.id,
                    }
                })
            }

            insertNode(next, child);
        }
    }

    // Insert the root node and its children into the graph.
    insertNode(node, graph);

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
