import { VISITOR_KEYS } from '@babel/types';
import type { Node, File } from '@babel/types';

/**
 * Regex that matches typical minifier-generated identifier names:
 *   - Single letters: a, b, x, _
 *   - Short alpha+digit combos: a1, b2, t3, _0
 *   - Two-letter names: ab, fn, cb, el
 *   - Underscore prefixed short names: _a, _b
 */
const OBFUSCATED_IDENTIFIER_RE = /^[a-zA-Z_$][a-zA-Z0-9_$]?[0-9]?$/;

function walkNode(node: Node | null | undefined, seen: Set<string>): void {
  if (!node || typeof node !== 'object') return;

  if (node.type === 'Identifier') {
    const name = (node as any).name as string;
    if (OBFUSCATED_IDENTIFIER_RE.test(name)) {
      seen.add(name);
    }
  }

  const keys = VISITOR_KEYS[node.type];
  if (!keys) return;

  for (const key of keys) {
    const child = (node as any)[key];
    if (Array.isArray(child)) {
      for (const c of child) walkNode(c, seen);
    } else if (child && typeof child === 'object') {
      walkNode(child as Node, seen);
    }
  }
}

/**
 * Counts the number of unique obfuscated/minified identifier names in `ast`.
 * This approximates the number of rename calls humanify will make, since
 * humanify calls the LLM once per unique identifier it decides to rename.
 *
 * @param ast - The Babel File AST of the app-code-only portion of the bundle.
 * @returns The count of unique short identifiers found.
 */
export function countObfuscatedIdentifiers(ast: File): number {
  const seen = new Set<string>();
  walkNode(ast, seen);
  return seen.size;
}
