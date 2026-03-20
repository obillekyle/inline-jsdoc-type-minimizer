import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  const hiddenTextDecoration = vscode.window.createTextEditorDecorationType({
    textDecoration: 'none; display: none;',
  });

  function updateDecorations() {
    const editor = vscode.window.activeTextEditor;

    if (!editor || editor.document.languageId !== 'javascript') {
      return;
    }

    const text = editor.document.getText();
    const regex =
      /\/\*\*\s*@type\s*{([\s\S]*?)}\s*\*\/\s*(?=\(\s*([a-zA-Z0-9_$.]+)?)/g;
    const decorations: vscode.DecorationOptions[] = [];

    const config = vscode.workspace.getConfiguration(
      'inline-jsdoc-type-minimizer',
    );
    const bracketColor =
      config.get<string>('bracketColor') ||
      new vscode.ThemeColor('editorInlayHint.foreground');

    const diagnostics = vscode.languages.getDiagnostics(editor.document.uri);
    const errors = diagnostics.filter(
      (d) => d.severity === vscode.DiagnosticSeverity.Error,
    );

    let match;
    while ((match = regex.exec(text))) {
      const startPos = editor.document.positionAt(match.index);
      const endPos = editor.document.positionAt(match.index + match[0].length);
      const matchRange = new vscode.Range(startPos, endPos);

      const hasError = errors.some((diagnostic) => {
        return matchRange.intersection(diagnostic.range) !== undefined;
      });

      const finalColor = hasError
        ? new vscode.ThemeColor('editorError.foreground')
        : bracketColor;

      const isRevealed = editor.selections.some((selection) => {
        return (
          selection.start.line <= startPos.line &&
          selection.end.line >= startPos.line
        );
      });

      if (isRevealed) {
        continue;
      }

      const originalType = match[1].trim();
      const variableName = match[2] ? match[2] : 'value';

      let typeName = originalType;

      typeName = typeName.replace(
        /import\(['"]([^'"]+)['"]\)(?:\.([a-zA-Z0-9_]+))?/g,
        (fullMatch, modulePath, exportName) => {
          return exportName
            ? exportName
            : modulePath.split('/').pop() || 'import';
        },
      );

      let typeDepth = 0;
      let topLevelOrs = 0;
      let topLevelAnds = 0;
      let firstSeparatorIndex = -1;

      for (let i = 0; i < typeName.length; i++) {
        const char = typeName[i];
        switch (char) {
          case '{':
          case '[':
          case '(':
          case '<':
            typeDepth++;
            break;
          case '}':
          case ']':
          case ')':
          case '>':
            typeDepth--;
            break;
          case '|':
            if (typeDepth === 0) {
              topLevelOrs++;
              if (firstSeparatorIndex === -1) firstSeparatorIndex = i;
            }
            break;
          case '&':
            if (typeDepth === 0) {
              topLevelAnds++;
              if (firstSeparatorIndex === -1) firstSeparatorIndex = i;
            }
            break;
        }
      }

      if (topLevelOrs > 0 && topLevelAnds > 0) {
        typeName = `mixed+${topLevelOrs + topLevelAnds}`;
      } else if (topLevelOrs > 0) {
        const firstType = typeName.substring(0, firstSeparatorIndex).trim();
        typeName = `${firstType}|+${topLevelOrs}`;
      } else if (topLevelAnds > 0) {
        const firstType = typeName.substring(0, firstSeparatorIndex).trim();
        typeName = `${firstType}&+${topLevelAnds}`;
      } else if (typeName.startsWith('{') && typeName.endsWith('}')) {
        const innerProps = typeName.slice(1, -1).trim();

        let depth = 0;
        let topLevelCommas = 0;
        let firstPropEnd = -1;

        for (let i = 0; i < innerProps.length; i++) {
          const char = innerProps[i];
          switch (char) {
            case '{':
            case '[':
            case '(':
            case '<':
              depth++;
              break;
            case '}':
            case ']':
            case ')':
            case '>':
              depth--;
              break;
            case ',':
              if (depth === 0) {
                topLevelCommas++;
                if (firstPropEnd === -1) {
                  firstPropEnd = i;
                }
              }
              break;
          }
        }

        if (topLevelCommas === 0) {
          typeName = `{${innerProps}}`;
        } else {
          const firstProp = innerProps.substring(0, firstPropEnd).trim();
          typeName = `{${firstProp}, +${topLevelCommas}}`;
        }
      }

      const hoverMessage = new vscode.MarkdownString();
      hoverMessage.appendCodeblock(
        `${variableName}: ${originalType}`,
        'typescript',
      );

      decorations.push({
        range: matchRange,
        hoverMessage: hoverMessage,
        renderOptions: {
          before: {
            contentText: `<${typeName}>`,
            color: finalColor,
            fontStyle: 'normal',
          },
        },
      });
    }

    editor.setDecorations(hiddenTextDecoration, decorations);
  }

  vscode.window.onDidChangeActiveTextEditor(
    updateDecorations,
    null,
    context.subscriptions,
  );

  vscode.workspace.onDidChangeTextDocument(
    (event) => {
      if (
        vscode.window.activeTextEditor &&
        event.document === vscode.window.activeTextEditor.document
      ) {
        updateDecorations();
      }
    },
    null,
    context.subscriptions,
  );

  vscode.window.onDidChangeTextEditorSelection(
    (event) => {
      if (event.textEditor === vscode.window.activeTextEditor) {
        updateDecorations();
      }
    },
    null,
    context.subscriptions,
  );

  updateDecorations();
}

export function deactivate() {}
