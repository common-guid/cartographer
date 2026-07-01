import { describe, it, expect } from 'vitest';
import { BabelASTService } from '../src/services/ast/babel-core.js';

describe('BabelASTService', () => {
  const astService = new BabelASTService();

  it('should parse, traverse, and generate code correctly', () => {
    const rawCode = 'const x = 42;';
    
    // 1. Parse
    const ast = astService.parseCode(rawCode);
    expect(ast).toBeDefined();
    expect(ast.type).toBe('File');

    // 2. Traverse
    let visited = false;
    let varName = '';
    astService.traverseAst(ast, {
      VariableDeclarator(path: any) {
        visited = true;
        varName = path.node.id.name;
      }
    });
    expect(visited).toBe(true);
    expect(varName).toBe('x');

    // 3. Generate
    const generatedCode = astService.generateCode(ast).trim();
    // Normalize spaces/semicolons
    expect(generatedCode.replace(/\s+/g, '')).toBe('constx=42;');
  });

  it('should support renaming bindings', () => {
    const rawCode = 'function test(a) { return a + 1; }';
    const ast = astService.parseCode(rawCode);
    
    let targetScope: any = null;
    astService.traverseAst(ast, {
      FunctionDeclaration(path: any) {
        targetScope = path.scope;
      }
    });

    expect(targetScope).toBeDefined();
    astService.renameBinding(targetScope, 'a', 'renamedA');

    const generatedCode = astService.generateCode(ast).trim();
    expect(generatedCode).toContain('renamedA');
    expect(generatedCode).not.toContain('(a)');
  });
});
