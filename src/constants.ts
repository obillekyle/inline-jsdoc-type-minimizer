export const EXTENSION_ID = 'inline-jsdoc-type-minimizer';
export const LANGUAGE_IDS = ['javascript', 'html'];

export const TYPE_REGEX =
  /\/\*\*[ \t]*@type[ \t]*{([^\r\n]*?)}([ \t]+@readonly\b)?[ \t]*\*\/[ \t]*(?=\r?\n|\(|#?[a-zA-Z_$][0-9a-zA-Z_$]*\s*=)/g;

export const PARAM_TYPE_REGEX =
  /\/\*\*[ \t]*@type[ \t]*{([^\r\n]*?)}([ \t]+@readonly\b)?[ \t]*\*\/[ \t]*(?=[a-zA-Z_$\[{])/g;

export const TYPEDEF_REGEX =
  /\/\*\*[ \t]*@typedef[ \t]*{([^\r\n]*?)}[ \t]*([a-zA-Z_$][0-9a-zA-Z_$]*)[ \t]*\*\//g;

export const IMPORT_REGEX = /import\(['"]([^'"]+)['"]\)(?:\.([a-zA-Z0-9_]+))?/g;
