import type { File } from '@babel/types';
import _generator from '@babel/generator';
import { ALL_FINGERPRINTS } from './fingerprints/index.js';
import { getStatementsToProcess } from './utils.js';
import type { FilterResult, ClassifiedNode, FilterStats } from './types.js';

const generate: any = (typeof _generator === 'function' ? _generator : (_generator as any).default);

export class BoilerplateClassifier {
  classify(ast: File, code?: string): FilterResult {
    const classifiedNodes: ClassifiedNode[] = [];
    const appNodeIndices = new Set<number>();
    const boilerplateNodeIndices = new Set<number>();

    let boilerplateChars = 0;
    let appChars = 0;

    const { statements } = getStatementsToProcess(ast);
    const totalNodes = statements.length;

    for (let i = 0; i < totalNodes; i++) {
      const node = statements[i];
      let nodeSource = '';

      if (code && typeof node.start === 'number' && typeof node.end === 'number') {
        nodeSource = code.slice(node.start, node.end);
      } else {
        nodeSource = generate(node).code;
      }

      const matchedFingerprint = ALL_FINGERPRINTS.find(fp => fp.match(node, nodeSource));
      const classification = matchedFingerprint ? 'boilerplate' : 'app';

      if (classification === 'boilerplate') {
        boilerplateNodeIndices.add(i);
        boilerplateChars += nodeSource.length;
      } else {
        appNodeIndices.add(i);
        appChars += nodeSource.length;
      }

      classifiedNodes.push({
        node,
        classification,
        reason: matchedFingerprint?.id ?? 'app:unknown',
        nodeIndex: i,
      });
    }

    const totalChars = boilerplateChars + appChars;
    const appCodeRatio = totalChars > 0 ? appChars / totalChars : 1.0;
    const estimatedTokensSaved = Math.max(0, Math.ceil(boilerplateChars / 4));

    const stats: FilterStats = {
      totalNodes,
      boilerplateNodes: boilerplateNodeIndices.size,
      appNodes: appNodeIndices.size,
      estimatedTokensSaved,
    };

    return {
      classifiedNodes,
      appNodeIndices,
      boilerplateNodeIndices,
      appCodeRatio,
      stats,
    };
  }
}
