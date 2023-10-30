import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'


export function getHtmlContent(context: vscode.ExtensionContext){
    const filePath: vscode.Uri = vscode.Uri.file(path.join(context.extensionPath, 'src', 'html', 'graph.html'));
    return fs.readFileSync(filePath.fsPath, 'utf8');
}