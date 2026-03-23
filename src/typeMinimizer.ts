import { parseImports } from './parsers/import';
import { parseFunction } from './parsers/function';
import { parseLogical } from './parsers/logical';
import { parseObject } from './parsers/object';

export interface MinimizerOptions {
  collapseTypes: boolean;
  collapseObjects: boolean;
  maxShownTypes: number;
}

export function minimizeType(
  originalType: string,
  options: MinimizerOptions,
): string {
  let typeName = parseImports(originalType);

  let typeDepth = 0;
  let topLevelOrs = 0;
  let topLevelAnds = 0;
  let firstSeparatorIndex = -1;
  const topLevelSeparators: { index: number; char: string }[] = [];
  let isFunctionType = false;
  let functionReturnIndex = -1;

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
      case '=':
        if (
          typeDepth === 0 &&
          i + 1 < typeName.length &&
          typeName[i + 1] === '>'
        ) {
          isFunctionType = true;
          functionReturnIndex = i;
        }
        break;
      case '|':
        if (typeDepth === 0) {
          topLevelOrs++;
          if (firstSeparatorIndex === -1) {
            firstSeparatorIndex = i;
          }
          topLevelSeparators.push({ index: i, char: '|' });
        }
        break;
      case '&':
        if (typeDepth === 0) {
          topLevelAnds++;
          if (firstSeparatorIndex === -1) {
            firstSeparatorIndex = i;
          }
          topLevelSeparators.push({ index: i, char: '&' });
        }
        break;
    }
  }

  let hasUndefined = false;
  if (topLevelOrs > 0 && topLevelAnds === 0) {
    const parts = [];
    let lastIndex = 0;
    for (const sep of topLevelSeparators) {
      parts.push(typeName.substring(lastIndex, sep.index));
      lastIndex = sep.index + 1;
    }
    parts.push(typeName.substring(lastIndex));

    const nonUndefinedParts = parts.filter((p) => p.trim() !== 'undefined');
    if (nonUndefinedParts.length < parts.length) {
      hasUndefined = true;
      typeName = nonUndefinedParts.map((p) => p.trim()).join(' | ');
      // Recalculate separators and counts
      topLevelOrs = nonUndefinedParts.length - 1;
      topLevelSeparators.length = 0;
      let newTypeDepth = 0;
      for (let i = 0; i < typeName.length; i++) {
        const char = typeName[i];
        if (char === '{' || char === '[' || char === '(' || char === '<')
          newTypeDepth++;
        else if (char === '}' || char === ']' || char === ')' || char === '>')
          newTypeDepth--;
        else if (char === '|' && newTypeDepth === 0) {
          topLevelSeparators.push({ index: i, char: '|' });
        }
      }
    }
  }

  if (options.collapseTypes && isFunctionType) {
    const paramsPart = typeName.substring(0, functionReturnIndex).trim();
    const returnPart = typeName.substring(functionReturnIndex + 2).trim();
    const parsed = parseFunction(paramsPart, returnPart);
    if (parsed) {
      typeName = parsed;
    }
  } else if (options.collapseTypes && topLevelSeparators.length > 0) {
    typeName = parseLogical(
      typeName,
      topLevelOrs,
      topLevelAnds,
      topLevelSeparators,
      options.maxShownTypes,
    );
  } else if (
    options.collapseObjects &&
    typeName.startsWith('{') &&
    typeName.endsWith('}')
  ) {
    typeName = parseObject(typeName);
  }

  if (hasUndefined) {
    typeName += '?';
  }

  return typeName;
}
