import _traverse from '@babel/traverse';
import { cloneNode } from '@babel/types';
import type { File } from '@babel/types';
import type { RenameMap } from './types.js';

const traverse: any = (typeof _traverse === 'function' ? _traverse : (_traverse as any).default);

export class Reintegrator {
  reintegrate(fullAST: File, renameMap: RenameMap): File {
    // Deep clone the AST to avoid mutating the original
    const mergedAST = cloneNode(fullAST);

    traverse(mergedAST, {
      Identifier(path: any) {
        if (path.isReferencedIdentifier() || path.isBindingIdentifier()) {
          const renamed = renameMap.get(path.node.name);
          if (renamed) {
            path.node.name = renamed;
          }
        }
      }
    });

    return mergedAST;
  }
}
