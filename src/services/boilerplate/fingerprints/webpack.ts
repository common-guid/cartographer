import type { Fingerprint } from './index.js';
import { isShortFunction } from './helpers.js';

export const WEBPACK_FINGERPRINTS: Fingerprint[] = [
  // ── Webpack module factory IIFE ─────────────────────────────────────────
  {
    id: 'webpack:runtime-bootstrap',
    category: 'webpack',
    match(node, src) {
      return (
        src.includes('__webpack_require__') ||
        src.includes('__webpack_modules__') ||
        src.includes('__webpack_exports__')
      );
    }
  },

  // ── Rollup/esbuild ESM interop helper ───────────────────────────────────
  {
    id: 'bundler:esm-interop',
    category: 'rollup',
    match(node, src) {
      return (
        src.includes('__esModule') &&
        src.includes('Object.defineProperty') &&
        isShortFunction(node)
      );
    }
  }
];
