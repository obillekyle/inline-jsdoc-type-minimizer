import * as vscode from 'vscode';

const EXTENSION_ID = 'inline-jsdoc-type-minimizer';
const LANGUAGE_IDS = ['javascript', 'html'];

const TYPE_REGEX =
  /\/\*\*[ \t]*@type[ \t]*{([^\r\n]*?)}[ \t]*\*\/[ \t]*(?=\r?\n|\()/g;
const IMPORT_REGEX = /import\(['"]([^'"]+)['"]\)(?:\.([a-zA-Z0-9_]+))?/g;

export function activate(context: vscode.ExtensionContext) {
  const newDecorType = vscode.window.createTextEditorDecorationType;

  const lBracketDecorType = newDecorType({});
  const typeNameDecorType = newDecorType({});
  const rBracketDecorType = newDecorType({});
  const hideTextDecorType = newDecorType({
    textDecoration: 'none; font-size: 0.001em; opacity: 0;',
  });

  const toggleCommand = vscode.commands.registerCommand(
    EXTENSION_ID + '.toggle',
    async () => {
      const config = vscode.workspace.getConfiguration(EXTENSION_ID);
      const current = config.get<boolean>('enabled');
      await config.update('enabled', !current, true);
    },
  );
  context.subscriptions.push(toggleCommand);

  function updateDecorations() {
    const editor = vscode.window.activeTextEditor;

    if (!editor || !LANGUAGE_IDS.includes(editor.document.languageId)) {
      return;
    }

    const config = vscode.workspace.getConfiguration(EXTENSION_ID);

    if (config.get<boolean>('enabled') === false) {
      editor.setDecorations(hideTextDecorType, []);
      editor.setDecorations(lBracketDecorType, []);
      editor.setDecorations(typeNameDecorType, []);
      editor.setDecorations(rBracketDecorType, []);
      return;
    }

    const text = editor.document.getText();
    const regex = new RegExp(TYPE_REGEX);

    const lBracketDecors: vscode.DecorationOptions[] = [];
    const typeNameDecors: vscode.DecorationOptions[] = [];
    const rBracketDecors: vscode.DecorationOptions[] = [];
    const hideTextDecors: vscode.DecorationOptions[] = [];

    const bracketColor =
      config.get<string>('bracketColor') ||
      new vscode.ThemeColor('editorInlayHint.foreground');
    const collapseTypes = config.get<boolean>('collapseTypes') !== false;
    const collapseObjects = config.get<boolean>('collapseObjects') !== false;

    const diagnostics = vscode.languages.getDiagnostics(editor.document.uri);
    const errors = diagnostics.filter(
      (d) => d.severity === vscode.DiagnosticSeverity.Error,
    );

    let m;
    while ((m = regex.exec(text))) {
      const startPos = editor.document.positionAt(m.index);
      const endAtPos = editor.document.positionAt(m.index + m[0].length);
      const atRanges = new vscode.Range(startPos, endAtPos);
      const hasError = errors.some(
        ({ range }) => atRanges.intersection(range) !== undefined,
      );
      const revealed = editor.selections.some(
        (selection) =>
          selection.start.line <= startPos.line &&
          selection.end.line >= startPos.line,
      );

      if (revealed) continue;

      const originalType = m[1].trim();
      let typeName = originalType;

      typeName = typeName.replace(IMPORT_REGEX, (_, modulePath, exportName) =>
        exportName ? exportName : modulePath.split('/').pop() || 'import',
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
              if (firstSeparatorIndex === -1) {
                firstSeparatorIndex = i;
              }
            }
            break;
          case '&':
            if (typeDepth === 0) {
              topLevelAnds++;
              if (firstSeparatorIndex === -1) {
                firstSeparatorIndex = i;
              }
            }
            break;
        }
      }

      if (collapseTypes && (topLevelOrs > 0 || topLevelAnds > 0)) {
        if (topLevelOrs > 0 && topLevelAnds > 0) {
          typeName = `mixed+${topLevelOrs + topLevelAnds}`;
        } else {
          const firstType = typeName.substring(0, firstSeparatorIndex).trim();
          typeName = `${firstType}${topLevelOrs > 0 ? '|' : '&'}+${
            topLevelOrs || topLevelAnds
          }`;
        }
      } else if (
        collapseObjects &&
        typeName.startsWith('{') &&
        typeName.endsWith('}')
      ) {
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

      const typeColor = hasError
        ? new vscode.ThemeColor('editorError.foreground')
        : new vscode.ThemeColor('inlineJsdoc.typeColor');

      hideTextDecors.push({
        range: atRanges,
      });

      const injectionRange = new vscode.Range(startPos, startPos);

      lBracketDecors.push({
        range: injectionRange,
        renderOptions: {
          before: {
            contentText: '<',
            color: bracketColor,
            fontStyle: 'normal',
          },
        },
      });

      typeNameDecors.push({
        range: injectionRange,
        renderOptions: {
          before: {
            contentText: typeName,
            color: typeColor,
            fontStyle: 'normal',
          },
        },
      });

      rBracketDecors.push({
        range: injectionRange,
        renderOptions: {
          before: {
            contentText: '>',
            color: bracketColor,
            fontStyle: 'normal',
          },
        },
      });
    }

    editor.setDecorations(hideTextDecorType, hideTextDecors);
    editor.setDecorations(lBracketDecorType, lBracketDecors);
    editor.setDecorations(typeNameDecorType, typeNameDecors);
    editor.setDecorations(rBracketDecorType, rBracketDecors);
  }

  vscode.window.onDidChangeActiveTextEditor(
    updateDecorations,
    null,
    context.subscriptions,
  );

  vscode.workspace.onDidChangeTextDocument(
    (event) => {
      vscode.window.activeTextEditor &&
        event.document === vscode.window.activeTextEditor.document &&
        updateDecorations();
    },
    null,
    context.subscriptions,
  );

  vscode.window.onDidChangeTextEditorSelection(
    (event) =>
      event.textEditor === vscode.window.activeTextEditor &&
      updateDecorations(),
    null,
    context.subscriptions,
  );

  vscode.workspace.onDidChangeConfiguration(
    (e) => e.affectsConfiguration(EXTENSION_ID) && updateDecorations(),
    null,
    context.subscriptions,
  );

  updateDecorations();
}

export function deactivate() {}
