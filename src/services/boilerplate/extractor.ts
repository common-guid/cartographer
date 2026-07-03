import { file, program } from '@babel/types';
import type { File } from '@babel/types';
import _generator from '@babel/generator';
import type { FilterResult } from './types.js';

const generate: any = (typeof _generator === 'function' ? _generator : (_generator as any).default);

export class AppCodeExtractor {
  extract(fullAST: File, filterResult: FilterResult): { appCode: string; appAST: File } {
    const appBody = filterResult.classifiedNodes
      .filter(cn => cn.classification === 'app')
      .map(cn => cn.node as any);

    const appAST = file(program(appBody));
    const appCode = generate(appAST).code;

    return { appCode, appAST };
  }
}
