import { VISITOR_KEYS } from '@babel/types';
import type { Node, File } from '@babel/types';
import type { RenameMap } from './types.js';

export function traverseInParallel(
  node1: Node | null | undefined,
  node2: Node | null | undefined,
  callback: (n1: Node, n2: Node) => void
): void {
  if (!node1 || !node2) return;
  if (node1.type !== node2.type) return;

  callback(node1, node2);

  const keys = VISITOR_KEYS[node1.type];
  if (!keys) return;

  for (const key of keys) {
    const val1 = (node1 as any)[key];
    const val2 = (node2 as any)[key];

    if (Array.isArray(val1) && Array.isArray(val2)) {
      const minLength = Math.min(val1.length, val2.length);
      for (let i = 0; i < minLength; i++) {
        traverseInParallel(val1[i], val2[i], callback);
      }
    } else if (val1 && val2 && typeof val1 === 'object' && typeof val2 === 'object') {
      traverseInParallel(val1 as Node, val2 as Node, callback);
    }
  }
}

export class RenameMapBuilder {
  build(
    originalAppAST: File,
    renamedAppAST: File,
    boilerplateNames: Set<string> = new Set()
  ): RenameMap {
    const renameMap: RenameMap = new Map();

    traverseInParallel(originalAppAST, renamedAppAST, (origNode, renamedNode) => {
      if (origNode.type === 'Identifier' && renamedNode.type === 'Identifier') {
        const originalName = origNode.name;
        const renamedName = renamedNode.name;

        if (originalName !== renamedName) {
          if (boilerplateNames.has(renamedName)) {
            console.warn(
              `[RenameMapBuilder] Warning: Renamed identifier "${renamedName}" conflicts with boilerplate identifier name.`
            );
          }
          renameMap.set(originalName, renamedName);
        }
      }
    });

    return renameMap;
  }
}
