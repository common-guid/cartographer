import type { Node } from '@babel/types';
import { BABEL_FINGERPRINTS } from './babel.js';
import { WEBPACK_FINGERPRINTS } from './webpack.js';

export interface Fingerprint {
  id: string;               // e.g. "babel:regenerator-runtime"
  category: 'babel' | 'webpack' | 'rollup' | 'polyfill';
  match(node: Node, nodeSource: string): boolean;
}

export const ALL_FINGERPRINTS: Fingerprint[] = [
  ...BABEL_FINGERPRINTS,
  ...WEBPACK_FINGERPRINTS,
];
