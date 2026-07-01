import { describe, it, expect } from 'vitest';
import { BabelASTService } from '../src/services/ast/babel-core.js';
import { shouldRename } from '../src/services/llm/identifier-filter.js';

describe('Identifier Filter', () => {
  const astService = new BabelASTService();

  it('should identify which AST identifiers require LLM renaming', () => {
    const rawCode = `
      const window = {};
      const Promise = {};
      const loginUser = () => {};
      const _0x4f2 = 123;
      const a = 1;
      const b = 2;
    `;

    const ast = astService.parseCode(rawCode);
    const results: Record<string, boolean> = {};

    astService.traverseAst(ast, {
      Identifier(path: any) {
        const name = path.node.name;
        // Don't check property keys like console.log etc if they are not identifier bindings
        results[name] = shouldRename(name);
      }
    });

    // Assert that globals and descriptive names are skipped (shouldRename returns false)
    expect(results['window']).toBe(false);
    expect(results['Promise']).toBe(false);
    expect(results['loginUser']).toBe(false);

    // Assert that obfuscated/short names are flagged for renaming (shouldRename returns true)
    expect(results['_0x4f2']).toBe(true);
    expect(results['a']).toBe(true);
    expect(results['b']).toBe(true);
  });
});
