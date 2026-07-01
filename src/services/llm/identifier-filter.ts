const STATIC_SKIP_LIST = new Set([
  'window', 'document', 'process', 'Buffer', '__webpack_require__',
  'Array', 'Promise', 'Object', 'Function', 'Boolean', 'Symbol',
  'Error', 'EvalError', 'RangeError', 'ReferenceError', 'SyntaxError',
  'TypeError', 'URIError', 'Number', 'Math', 'Date', 'String', 'RegExp',
  'JSON', 'Map', 'Set', 'WeakMap', 'WeakSet', 'console', 'setTimeout',
  'clearTimeout', 'setInterval', 'clearInterval', 'require', 'exports',
  'module', 'define', 'global', 'globalThis', 'self'
]);

export function shouldRename(name: string): boolean {
  // 1. Static skip list check
  if (STATIC_SKIP_LIST.has(name)) {
    return false;
  }

  // 2. Always rename: single-character names (a, x, _, $)
  if (name.length === 1 && /^[a-zA-Z_$]$/.test(name)) {
    return true;
  }

  // 3. Always rename: hexadecimal patterns matching /^_0x[0-9a-fA-F]+$/
  if (/^_0x[0-9a-fA-F]+$/.test(name)) {
    return true;
  }

  // 4. Heuristic Quality Check: skips camelCase names that are >= 6 characters and contain at least one vowel
  if (name.length >= 6) {
    const hasVowel = /[aeiouAEIOU]/.test(name);
    if (hasVowel) {
      return false; // Assume pre-existing descriptive name
    }
  }

  // Rename anything else
  return true;
}
