import { CallHierarchy } from "./call"
import * as vscode from 'vscode'

export const getNode = (workspaceRoot: string, n: vscode.CallHierarchyItem) => {
    // Create a node with a name based on the URI, item name, and range.
    const uri = n.uri.toString().replace(workspaceRoot, '')
    return {
        id: `"${uri}#${n.name}@${n.range.start.line}:${n.range.start.character}"`,
        name: n.name,
        file: uri,
        uri: n.uri,
        line: n.range.start.line, //`${n.range.start.line}:${n.range.start.character}`,
        character: n.range.start.character,
    } as Node;
}

export const getCyNodes = (n: Node) => {
    return [
        {
            group: 'nodes',
            data: {
                id: `node:${n.id}`,
                label: n.name,
                parent: `file:${n.file}`,
                uri: n.uri,
                line: n.line,
                character: n.character,
            }
        } as CyNode,
        {
            group: 'nodes',
            data: {
                id: `file:${n.file}`,
                label: n.file,
                uri: n.uri,
                line: 0,
                character: 0,
            },
            classes: 'compound'
        } as CyNode,
    ]
}

export function getCyElems(workspaceRoot: string, edge: CallHierarchy) {
    const elems: Element[] = []

    // Iterate through the children of the CallHierarchy.
    const node = getNode(workspaceRoot, edge.item);
    elems.push(...getCyNodes(node))
    
    if (edge.from) {
        const from = getNode(workspaceRoot, edge.from);
        elems.push(...getCyNodes(from))
        elems.push({
            group: 'edges',
            data: {
                id: `edge:${from.id}:${node.id}`,
                source: `node:${from.id}`,
                target: `node:${node.id}`,
                label: edge.sequenceNumber ? edge.sequenceNumber : '(n/a)',
            }
        })
    } else if (edge.to) {
        const to = getNode(workspaceRoot, edge.to);
        elems.push(...getCyNodes(to))
        elems.push({
            group: 'edges',
            data: {
                id: `edge:${node.id}:${to.id}`,
                source: `node:${node.id}`,
                target: `node:${to.id}`,
                label: edge.sequenceNumber ? edge.sequenceNumber : '(n/a)',
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
        label: string;
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
