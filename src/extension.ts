import * as vscode from 'vscode';
import {
  EXTENSION_ID,
  LANGUAGE_IDS,
  TYPE_REGEX,
  PARAM_TYPE_REGEX,
  TYPEDEF_REGEX,
} from './constants';
import { minimizeType } from './parsers/type';

export function activate(context: vscode.ExtensionContext) {
  const newDecorType = vscode.window.createTextEditorDecorationType;

  const lBracketDecorType = newDecorType({});
  const typeNameDecorType = newDecorType({});
  const rBracketDecorType = newDecorType({});
  const typedefKeywordDecorType = newDecorType({});
  const typedefAliasDecorType = newDecorType({});
  const typedefOperatorDecorType = newDecorType({});
  const typedefBodyDecorType = newDecorType({});
  const typedefSemicolonDecorType = newDecorType({});
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
      editor.setDecorations(typedefKeywordDecorType, []);
      editor.setDecorations(typedefAliasDecorType, []);
      editor.setDecorations(typedefOperatorDecorType, []);
      editor.setDecorations(typedefBodyDecorType, []);
      editor.setDecorations(typedefSemicolonDecorType, []);
      return;
    }

    const text = editor.document.getText();

    const lBracketDecors: vscode.DecorationOptions[] = [];
    const typeNameDecors: vscode.DecorationOptions[] = [];
    const rBracketDecors: vscode.DecorationOptions[] = [];
    const typedefKeywordDecors: vscode.DecorationOptions[] = [];
    const typedefAliasDecors: vscode.DecorationOptions[] = [];
    const typedefOperatorDecors: vscode.DecorationOptions[] = [];
    const typedefBodyDecors: vscode.DecorationOptions[] = [];
    const typedefSemicolonDecors: vscode.DecorationOptions[] = [];
    const hideTextDecors: vscode.DecorationOptions[] = [];

    const bracketColor =
      config.get<string>('bracketColor') ||
      new vscode.ThemeColor('editorInlayHint.foreground');
    const collapseTypes = config.get<boolean>('collapseTypes') !== false;
    const collapseObjects = config.get<boolean>('collapseObjects') !== false;
    const maxShownTypes = Math.max(1, config.get<number>('maxShownTypes') ?? 1);
    const parseFunctionParameters =
      config.get<boolean>('parseFunctionParameters') !== false;
    const inlineAssignments =
      config.get<boolean>('inlineAssignments') !== false;
    const inlineReadonly = config.get<boolean>('inlineReadonly') !== false;
    const inlineTypedefs = config.get<boolean>('inlineTypedefs') !== false;
    const lengthAbort = config.get<number>('lengthAbort') ?? 300;
    const configTypeColor = config.get<string>('typeColor') || '';
    const parseInvalidParametersAsFallback =
      config.get<boolean>('parseInvalidParametersAsFallback') === true;

    const scriptRanges: { start: number; end: number }[] = [];
    if (editor.document.languageId === 'html') {
      const scriptStartRegex = /<\s*script[^>]*>/g;
      const scriptEndRegex = /<\s*\/\s*script\s*>/g;
      let sMatch;
      while ((sMatch = scriptStartRegex.exec(text))) {
        const start = sMatch.index;
        scriptEndRegex.lastIndex = start;
        const eMatch = scriptEndRegex.exec(text);
        const end = eMatch ? eMatch.index + eMatch[0].length : text.length;
        scriptRanges.push({ start, end });
      }
    }

    const diagnostics = vscode.languages.getDiagnostics(editor.document.uri);
    const errors = diagnostics.filter(
      (d) => d.severity === vscode.DiagnosticSeverity.Error,
    );

    const processRegex = (typeRegex: RegExp, isParamMode: boolean) => {
      let m: RegExpExecArray | null;
      while ((m = typeRegex.exec(text))) {
        const startPos = editor.document.positionAt(
          (m as RegExpExecArray).index,
        );
        const lineText = editor.document.lineAt(startPos.line).text;
        if (lineText.length >= lengthAbort) continue;

        if (editor.document.languageId === 'html') {
          const inScript = scriptRanges.some(
            (r) =>
              (m as RegExpExecArray).index >= r.start &&
              (m as RegExpExecArray).index <= r.end,
          );
          if (!inScript) continue;
        }
        const endAtPos = editor.document.positionAt(
          (m as RegExpExecArray).index + m[0].length,
        );
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
        const isReadonly = inlineReadonly && !!m[2];

        let typeName = minimizeType(originalType, {
          collapseTypes,
          collapseObjects,
          maxShownTypes,
        });

        const baseTypeColor =
          configTypeColor || new vscode.ThemeColor('inlineJsdoc.typeColor');
        const typeColor = hasError
          ? new vscode.ThemeColor('editorError.foreground')
          : baseTypeColor;

        const trailingContent = text.substring(
          (m as RegExpExecArray).index + m[0].length,
        );
        const varMatch = trailingContent.match(
          /^(#?[a-zA-Z_$][0-9a-zA-Z_$]*)(\s*=\s*)?/,
        );

        const isAssignment =
          !isParamMode && inlineAssignments && !!varMatch && !!varMatch[2];

        const isFunctionOrArrow = /(function\s*[a-zA-Z_$0-9]*\s*\(|\=\>)/.test(
          lineText,
        );
        const isMethodSignature =
          /^\s*(?:async\s+)?(?:static\s+)?(?:get\s+|set\s+)?[#a-zA-Z_$][0-9a-zA-Z_$]*\s*\(/.test(
            lineText,
          );
        const isParamContext =
          !!varMatch && (isFunctionOrArrow || isMethodSignature);
        const isValidParam =
          isParamMode &&
          !!varMatch &&
          (isFunctionOrArrow || isMethodSignature) &&
          !/^(const|let|var|function|class|yield|await|import|export)$/.test(
            varMatch[1],
          );

        if (parseFunctionParameters && !isParamMode && isParamContext) {
          continue;
        }

        let isGrayOut = false;
        if (isParamMode && !isValidParam) {
          if (!parseInvalidParametersAsFallback) continue;
          isGrayOut = true;
        }

        hideTextDecors.push({
          range: atRanges,
        });

        if (isParamMode && isValidParam) {
          let isOptionalParam = !!varMatch[2];
          if (typeName.endsWith('?')) {
            isOptionalParam = true;
            typeName = typeName.slice(0, -1);
          }

          const postfixPos = editor.document.positionAt(
            (m as RegExpExecArray).index + m[0].length + varMatch[1].length,
          );
          const injectionRange = new vscode.Range(postfixPos, postfixPos);

          typeNameDecors.push({
            range: injectionRange,
            renderOptions: {
              before: {
                contentText: `${isOptionalParam ? '?' : ''}: ${typeName}`,
                color: typeColor,
                fontStyle: 'normal',
              },
            },
          });
        } else if (isAssignment) {
          const assignmentPostfixPos = editor.document.positionAt(
            (m as RegExpExecArray).index + m[0].length + varMatch[1].length,
          );
          const assignmentRange = new vscode.Range(
            assignmentPostfixPos,
            assignmentPostfixPos,
          );

          if (isReadonly) {
            const readonlyRange = new vscode.Range(startPos, startPos);
            typeNameDecors.push({
              range: readonlyRange,
              renderOptions: {
                before: {
                  contentText: 'readonly ',
                  color: typeColor,
                  fontStyle: 'normal',
                },
              },
            });
          }

          typeNameDecors.push({
            range: assignmentRange,
            renderOptions: {
              before: {
                contentText: `: ${typeName}`,
                color: typeColor,
                fontStyle: 'normal',
              },
            },
          });
        } else if (!isParamMode || isGrayOut) {
          const displayColor = isGrayOut ? bracketColor : typeColor;
          const injectionRange = new vscode.Range(startPos, startPos);

          lBracketDecors.push({
            range: injectionRange,
            renderOptions: {
              before: {
                contentText: isReadonly ? 'readonly <' : '<',
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
                color: displayColor,
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
      }
    };

    const processTypedefs = (typedefRegex: RegExp) => {
      let m: RegExpExecArray | null;
      while ((m = typedefRegex.exec(text))) {
        const startPos = editor.document.positionAt(
          (m as RegExpExecArray).index,
        );
        const lineText = editor.document.lineAt(startPos.line).text;
        if (lineText.length >= lengthAbort) continue;

        if (editor.document.languageId === 'html') {
          const inScript = scriptRanges.some(
            (r) =>
              (m as RegExpExecArray).index >= r.start &&
              (m as RegExpExecArray).index <= r.end,
          );
          if (!inScript) continue;
        }

        const endAtPos = editor.document.positionAt(
          (m as RegExpExecArray).index + m[0].length,
        );
        const typedefRange = new vscode.Range(startPos, endAtPos);
        const hasError = errors.some(
          ({ range }) => typedefRange.intersection(range) !== undefined,
        );
        const revealed = editor.selections.some(
          (selection) =>
            selection.start.line <= startPos.line &&
            selection.end.line >= startPos.line,
        );

        if (revealed) continue;

        const originalType = m[1].trim();
        const aliasName = m[2].trim();
        const typeName = minimizeType(originalType, {
          collapseTypes,
          collapseObjects,
          maxShownTypes,
        });

        const baseTypeColor =
          configTypeColor || new vscode.ThemeColor('inlineJsdoc.typeColor');
        const typeColor = hasError
          ? new vscode.ThemeColor('editorError.foreground')
          : baseTypeColor;
        const typedefKeywordBlue = '#569CD6';
        const typedefAliasColor = hasError
          ? new vscode.ThemeColor('editorError.foreground')
          : typeColor;
        const typedefOperatorColor = hasError
          ? new vscode.ThemeColor('editorError.foreground')
          : new vscode.ThemeColor('editor.foreground');

        hideTextDecors.push({
          range: typedefRange,
        });

        // Render typedef as tokenized text so it visually matches TS syntax.
        typedefKeywordDecors.push({
          range: typedefRange,
          renderOptions: {
            before: {
              contentText: 'type ',
              color: typedefKeywordBlue,
              fontStyle: 'normal',
            },
          },
        });

        typedefAliasDecors.push({
          range: typedefRange,
          renderOptions: {
            before: {
              contentText: `${aliasName} `,
              color: typedefAliasColor,
              fontStyle: 'normal',
            },
          },
        });

        typedefOperatorDecors.push({
          range: typedefRange,
          renderOptions: {
            before: {
              contentText: '= ',
              color: typedefOperatorColor,
              fontStyle: 'normal',
            },
          },
        });

        typedefBodyDecors.push({
          range: typedefRange,
          renderOptions: {
            before: {
              contentText: `${typeName}`,
              color: typeColor,
              fontStyle: 'normal',
            },
          },
        });

        typedefSemicolonDecors.push({
          range: typedefRange,
          renderOptions: {
            before: {
              contentText: ';',
              color: typedefOperatorColor,
              fontStyle: 'normal',
            },
          },
        });
      }
    };

    processRegex(new RegExp(TYPE_REGEX, 'g'), false);
    if (parseFunctionParameters) {
      processRegex(new RegExp(PARAM_TYPE_REGEX, 'g'), true);
    }
    if (inlineTypedefs) {
      processTypedefs(new RegExp(TYPEDEF_REGEX, 'g'));
    }
    editor.setDecorations(hideTextDecorType, hideTextDecors);
    editor.setDecorations(lBracketDecorType, lBracketDecors);
    editor.setDecorations(typeNameDecorType, typeNameDecors);
    editor.setDecorations(rBracketDecorType, rBracketDecors);
    editor.setDecorations(typedefKeywordDecorType, typedefKeywordDecors);
    editor.setDecorations(typedefAliasDecorType, typedefAliasDecors);
    editor.setDecorations(typedefOperatorDecorType, typedefOperatorDecors);
    editor.setDecorations(typedefBodyDecorType, typedefBodyDecors);
    editor.setDecorations(typedefSemicolonDecorType, typedefSemicolonDecors);
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
