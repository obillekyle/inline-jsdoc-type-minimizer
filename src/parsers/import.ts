import { IMPORT_REGEX } from '../constants';

export function parseImports(typeName: string): string {
  return typeName.replace(IMPORT_REGEX, (_, modulePath, exportName) =>
    exportName ? exportName : modulePath.split('/').pop() || 'import',
  );
}
