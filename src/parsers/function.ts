export function parseFunction(
  paramsPart: string,
  returnPart: string,
): string | null {
  if (paramsPart.startsWith('(') && paramsPart.endsWith(')')) {
    const innerParams = paramsPart.slice(1, -1).trim();
    let pDepth = 0;
    let firstCommaIndex = -1;
    for (let p = 0; p < innerParams.length; p++) {
      const pChar = innerParams[p];
      if (pChar === '{' || pChar === '[' || pChar === '(' || pChar === '<')
        pDepth++;
      else if (pChar === '}' || pChar === ']' || pChar === ')' || pChar === '>')
        pDepth--;
      else if (pChar === ',' && pDepth === 0) {
        if (firstCommaIndex === -1) {
          firstCommaIndex = p;
        }
      }
    }
    let displayedParams = innerParams;
    if (firstCommaIndex !== -1) {
      displayedParams =
        innerParams.substring(0, firstCommaIndex).trim() + ', ...';
    }
    return `fn(${displayedParams}): ${returnPart}`;
  }
  return null;
}
