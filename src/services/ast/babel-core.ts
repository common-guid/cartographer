import _babelCore from '@babel/core';
import _traverse from '@babel/traverse';
import _generator from '@babel/generator';
import { parse as _parse } from '@babel/parser';

// Resolve CJS default export issues for ES modules safely
const traverse: any = (typeof _traverse === 'function' ? _traverse : (_traverse as any).default);
const generate: any = (typeof _generator === 'function' ? _generator : (_generator as any).default);

export interface ASTService {
  parseCode(code: string): _babelCore.types.File;
  traverseAst(ast: _babelCore.types.File, visitors: any): void;
  generateCode(ast: _babelCore.types.File): string;
  renameBinding(scope: any, oldName: string, newName: string): void;
}

export class BabelASTService implements ASTService {
  parseCode(code: string): _babelCore.types.File {
    return _parse(code, {
      sourceType: 'unambiguous',
      plugins: ['jsx', 'typescript'],
    });
  }

  traverseAst(ast: _babelCore.types.File, visitors: any): void {
    traverse(ast, visitors);
  }

  generateCode(ast: _babelCore.types.File): string {
    return generate(ast).code;
  }

  renameBinding(scope: any, oldName: string, newName: string): void {
    if (scope && typeof scope.rename === 'function') {
      scope.rename(oldName, newName);
    } else {
      throw new Error('Invalid scope object passed to renameBinding');
    }
  }
}
