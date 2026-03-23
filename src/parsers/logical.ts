export function parseLogical(
  typeName: string,
  topLevelOrs: number,
  topLevelAnds: number,
  topLevelSeparators: { index: number; char: string }[],
  maxShownTypes: number,
): string {
  if (topLevelOrs > 0 && topLevelAnds > 0) {
    return `mixed+${topLevelOrs + topLevelAnds}`;
  } else {
    const char = topLevelOrs > 0 ? '|' : '&';
    const totalSeparators = topLevelOrs || topLevelAnds;
    if (totalSeparators >= maxShownTypes) {
      const separatorIndex = topLevelSeparators[maxShownTypes - 1].index;
      const shownParts = typeName.substring(0, separatorIndex).trim();
      const hiddenCount = totalSeparators - maxShownTypes + 1;
      return `${shownParts} ${char} +${hiddenCount}`;
    }
  }
  return typeName;
}
