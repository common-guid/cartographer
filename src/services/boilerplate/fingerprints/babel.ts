import type { Fingerprint } from './index.js';
import { isFunctionDeclarationOrExpression, isShortFunction } from './helpers.js';

export const BABEL_FINGERPRINTS: Fingerprint[] = [
  // ── Babel regenerator runtime ──────────────────────────────────────────
  {
    id: 'babel:regenerator-runtime',
    category: 'babel',
    match(node, src) {
      return (
        src.includes('"@@iterator"') &&
        src.includes('"GeneratorFunction"') &&
        src.includes('_invoke')
      );
    }
  },

  // ── _typeof polyfill ───────────────────────────────────────────────────
  {
    id: 'babel:typeof-helper',
    category: 'babel',
    match(node, src) {
      return (
        src.includes('Symbol.iterator') &&
        (src.includes('"symbol"') || src.includes("'symbol'")) &&
        src.includes('typeof') &&
        isShortFunction(node)
      );
    }
  },

  // ── _classCallCheck ────────────────────────────────────────────────────
  {
    id: 'babel:class-call-check',
    category: 'babel',
    match(node, src) {
      return (
        src.includes('instanceof') &&
        src.includes('TypeError') &&
        (src.includes('"Cannot call a class as a function"') ||
          src.includes("'Cannot call a class as a function'")) &&
        isShortFunction(node)
      );
    }
  },

  // ── _createClass / _defineProperties ─────────────────────────────────
  {
    id: 'babel:create-class',
    category: 'babel',
    match(node, src) {
      return (
        src.includes('enumerable') &&
        src.includes('configurable') &&
        src.includes('Object.defineProperty') &&
        src.includes('.prototype') &&
        isShortFunction(node)
      );
    }
  },

  // ── _toPrimitive ───────────────────────────────────────────────────────
  {
    id: 'babel:to-primitive',
    category: 'babel',
    match(node, src) {
      return (
        src.includes('Symbol.toPrimitive') &&
        (src.includes('"@@toPrimitive must return a primitive value."') ||
          src.includes("'@@toPrimitive must return a primitive value.'"))
      );
    }
  },

  // ── _toPropertyKey ─────────────────────────────────────────────────────
  {
    id: 'babel:to-property-key',
    category: 'babel',
    match(node, src) {
      return (
        src.includes('Symbol.toPrimitive') &&
        (src.includes('"symbol"') || src.includes("'symbol'")) &&
        isShortFunction(node)
      );
    }
  },

  // ── asyncGeneratorStep / _asyncToGenerator ────────────────────────────
  {
    id: 'babel:async-to-generator',
    category: 'babel',
    match(node, src) {
      return (
        src.includes('"Generator is already running"') ||
        src.includes("'Generator is already running'") ||
        src.includes('asyncGeneratorStep') ||
        (src.includes('.done') &&
          src.includes('Promise.resolve') &&
          src.includes('.value') &&
          isShortFunction(node))
      );
    }
  },

  // ── _objectSpread2 / _extends ─────────────────────────────────────────
  {
    id: 'babel:object-spread',
    category: 'babel',
    match(node, src) {
      return (
        src.includes('Object.getOwnPropertyDescriptors') &&
        src.includes('Object.defineProperties') &&
        isShortFunction(node)
      );
    }
  },

  // ── _defineProperty ────────────────────────────────────────────────────
  {
    id: 'babel:define-property',
    category: 'babel',
    match(node, src) {
      return (
        src.includes('Object.defineProperty') &&
        src.includes('enumerable') &&
        src.includes('configurable') &&
        src.includes('writable') &&
        isShortFunction(node)
      );
    }
  }
];
