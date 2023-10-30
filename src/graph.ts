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


export function generateGraph(edge: CallHierarchy) {
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
            line: n.range.start.line, //`${n.range.start.line}:${n.range.start.character}`,
            character: n.range.start.character,
        } as Node;
    }

    const elems: Element[] = []

    // Define a function to insert a node and its children into the graph.
    const insertNode = (n: Node) => {
        elems.push({
            group: 'nodes',
            data: {
                id: `node:${n.id}`,
                label: n.name,
                parent: `file:${n.file}`,
                uri: n.uri,
                line: n.line,
                character: n.character,
            }
        })

        elems.push({
            group: 'nodes',
            data: {
                id: `file:${n.file}`,
                label: n.file,
                uri: n.uri,
                line: 0,
                character: 0,
            },
            classes: 'compound'
        })
    }

    // Iterate through the children of the CallHierarchy.
    const node = getNode(edge.item);
    insertNode(node);
    
    if (edge.from) {
        const from = getNode(edge.from);
        insertNode(from);
        elems.push({
            group: 'edges',
            data: {
                id: `edge:${from.id}:${node.id}`,
                source: `node:${from.id}`,
                target: `node:${node.id}`,
            }
        })
    } else if (edge.to) {
        const to = getNode(edge.to);
        insertNode(to);
        elems.push({
            group: 'edges',
            data: {
                id: `edge:${node.id}:${to.id}`,
                source: `node:${node.id}`,
                target: `node:${to.id}`,
            }
        })
    }

    // Return the generated graph.
    return elems;
}


export type CyNode = {
    group: 'nodes';
    data: {
        id: string;
        label: string;
        parent?: string;
        uri: vscode.Uri;
        line: number;
        character: number;
    };
    classes?: string;
};

export type CyEdge = {
    group: 'edges';
    data: {
        id: string;
        source: string;
        target: string;
    };
};

export type Element = CyNode | CyEdge;


export type Node = {
    id: string
    name: string,
    file: string,
    uri: vscode.Uri,
    line: number,
    character: number,
}
