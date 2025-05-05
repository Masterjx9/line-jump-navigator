import * as vscode from 'vscode';

type JumpPoint = { uri: vscode.Uri; position: vscode.Position };

const jumpDecorationType = vscode.window.createTextEditorDecorationType({
  gutterIconPath: vscode.Uri.joinPath(
    vscode.extensions.getExtension('masterjx9.breakpoint-navigator')!.extensionUri,
    'media',
    'dot.png'
  ),
  gutterIconSize: '12px'
});

const jumpPointsPerFile = new Map<string, JumpPoint[]>();
let currentJumpIndex = -1;

export function activate(context: vscode.ExtensionContext) {
  const markPoint = vscode.commands.registerCommand('jumpPoints.mark', () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const pos  = editor.selection.active;
    const file = editor.document.uri.toString();
    const list = jumpPointsPerFile.get(file) || [];

    const idx = list.findIndex(p => p.position.line === pos.line);

    if (idx !== -1) {
      list.splice(idx, 1);              
      vscode.window.showInformationMessage(`Jump point removed @ line ${pos.line + 1}`);
    } else {
      list.push({ uri: editor.document.uri, position: pos });  
      vscode.window.showInformationMessage(`Jump point added @ line ${pos.line + 1}`);
    }
    jumpPointsPerFile.set(file, list);
    refreshDecorations(editor);
  });

  const jumpNext = vscode.commands.registerCommand('jumpPoints.next', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const list = jumpPointsPerFile.get(editor.document.uri.toString()) || [];
    if (list.length === 0) return;

    currentJumpIndex = (currentJumpIndex + 1) % list.length;
    await jumpTo(list[currentJumpIndex]);
  });

  const jumpPrev = vscode.commands.registerCommand('jumpPoints.prev', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const list = jumpPointsPerFile.get(editor.document.uri.toString()) || [];
    if (list.length === 0) return;

    currentJumpIndex = (currentJumpIndex - 1 + list.length) % list.length;
    await jumpTo(list[currentJumpIndex]);
  });

  const repaintOnTab = vscode.window.onDidChangeActiveTextEditor(ed => {
    if (ed) refreshDecorations(ed);
  });

  context.subscriptions.push(markPoint, jumpNext, jumpPrev, repaintOnTab);
}


function refreshDecorations(editor: vscode.TextEditor) {
  const list  = jumpPointsPerFile.get(editor.document.uri.toString()) || [];
  const ranges = list.map(p => new vscode.Range(p.position, p.position));
  editor.setDecorations(jumpDecorationType, ranges);
}

async function jumpTo(point: JumpPoint) {
  const doc = await vscode.workspace.openTextDocument(point.uri);
  const ed  = await vscode.window.showTextDocument(doc);
  ed.selection = new vscode.Selection(point.position, point.position);
  ed.revealRange(new vscode.Range(point.position, point.position), vscode.TextEditorRevealType.InCenter);
}

export function deactivate() {}
