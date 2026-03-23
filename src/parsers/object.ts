export function parseObject(typeName: string): string {
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
    return `{${innerProps}}`;
  } else {
    const firstProp = innerProps.substring(0, firstPropEnd).trim();
    return `{${firstProp}, +${topLevelCommas}}`;
  }
}
