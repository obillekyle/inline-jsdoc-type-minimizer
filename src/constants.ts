export const EXTENSION_ID = 'inline-jsdoc-type-minimizer';
export const LANGUAGE_IDS = ['javascript', 'html'];

export const TYPE_REGEX =
  /\/\*\*[ \t]*@type[ \t]*{([^\r\n]*?)}[ \t]*\*\/[ \t]*(?=\r?\n|\()/g;

export const PARAM_TYPE_REGEX =
  /\/\*\*[ \t]*@type[ \t]*{([^\r\n]*?)}[ \t]*\*\/[ \t]*(?=[a-zA-Z_$\[{])/g;

export const IMPORT_REGEX = /import\(['"]([^'"]+)['"]\)(?:\.([a-zA-Z0-9_]+))?/g;
