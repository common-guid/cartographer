import { describe, it, expect } from 'vitest';
import { BabelASTService } from '../src/services/ast/babel-core.js';
import { ALL_FINGERPRINTS } from '../src/services/boilerplate/fingerprints/index.js';
import { isShortFunction } from '../src/services/boilerplate/fingerprints/helpers.js';

describe('Boilerplate Fingerprints', () => {
  const astService = new BabelASTService();

  function getFirstNodeAndSource(code: string) {
    const ast = astService.parseCode(code);
    const node = ast.program.body[0];
    const src = astService.generateCode(node);
    return { node, src };
  }

  describe('isShortFunction helper', () => {
    it('should correctly identify short functions', () => {
      const shortFuncCode = `
        function short() {
          const a = 1;
          const b = 2;
          return a + b;
        }
      `;
      const { node } = getFirstNodeAndSource(shortFuncCode);
      expect(isShortFunction(node, 12)).toBe(true);
    });

    it('should correctly identify long functions', () => {
      const longFuncCode = `
        function long() {
          let a = 1;
          a = a + 1;
          a = a + 1;
          a = a + 1;
          a = a + 1;
          a = a + 1;
          a = a + 1;
          a = a + 1;
          a = a + 1;
          a = a + 1;
          a = a + 1;
          a = a + 1;
          a = a + 1;
          a = a + 1;
          return a;
        }
      `;
      const { node } = getFirstNodeAndSource(longFuncCode);
      expect(isShortFunction(node, 12)).toBe(false);
    });
  });

  const fingerprints = new Map(ALL_FINGERPRINTS.map(fp => [fp.id, fp]));

  describe('Fingerprint matches', () => {
    // 1. babel:regenerator-runtime
    it('should match babel:regenerator-runtime positive and not negative', () => {
      const fp = fingerprints.get('babel:regenerator-runtime')!;
      expect(fp).toBeDefined();

      const positive = `
        function regenerator() {
          var Symbol = "function" && "@@iterator";
          var GeneratorFunction = "GeneratorFunction";
          function _invoke() {
            return 42;
          }
        }
      `;
      const { node, src } = getFirstNodeAndSource(positive);
      expect(fp.match(node, src)).toBe(true);

      const negative = `
        function appFunction() {
          // This is a normal function that does not contain the generator stuff
          return "normal";
        }
      `;
      const { node: nNode, src: nSrc } = getFirstNodeAndSource(negative);
      expect(fp.match(nNode, nSrc)).toBe(false);
    });

    // 2. babel:typeof-helper
    it('should match babel:typeof-helper positive and not negative', () => {
      const fp = fingerprints.get('babel:typeof-helper')!;
      expect(fp).toBeDefined();

      const positive = `
        function _typeof(obj) {
          return typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? typeof obj : typeof obj;
        }
      `;
      const { node, src } = getFirstNodeAndSource(positive);
      expect(fp.match(node, src)).toBe(true);

      const negative = `
        function typeChecker(obj) {
          // A long function with typeof to trigger false on isShortFunction
          let result = typeof obj;
          result = result + '1';
          result = result + '2';
          result = result + '3';
          result = result + '4';
          result = result + '5';
          result = result + '6';
          result = result + '7';
          result = result + '8';
          result = result + '9';
          result = result + '10';
          result = result + '11';
          result = result + '12';
          return result === "symbol" && Symbol.iterator;
        }
      `;
      const { node: nNode, src: nSrc } = getFirstNodeAndSource(negative);
      expect(fp.match(nNode, nSrc)).toBe(false);
    });

    // 3. babel:class-call-check
    it('should match babel:class-call-check positive and not negative', () => {
      const fp = fingerprints.get('babel:class-call-check')!;
      expect(fp).toBeDefined();

      const positive = `
        function _classCallCheck(instance, Constructor) {
          if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
          }
        }
      `;
      const { node, src } = getFirstNodeAndSource(positive);
      expect(fp.match(node, src)).toBe(true);

      const negative = `
        function validateInstance(instance, Constructor) {
          if (!(instance instanceof Constructor)) {
            throw new Error("Invalid instance");
          }
        }
      `;
      const { node: nNode, src: nSrc } = getFirstNodeAndSource(negative);
      expect(fp.match(nNode, nSrc)).toBe(false);
    });

    // 4. babel:create-class
    it('should match babel:create-class positive and not negative', () => {
      const fp = fingerprints.get('babel:create-class')!;
      expect(fp).toBeDefined();

      const positive = `
        function _createClass(Constructor, protoProps) {
          Object.defineProperty(Constructor.prototype, "key", {
            enumerable: false,
            configurable: true
          });
        }
      `;
      const { node, src } = getFirstNodeAndSource(positive);
      expect(fp.match(node, src)).toBe(true);

      const negative = `
        function defineAppProperty(obj, key, val) {
          // Normal app logic that happens to define a property but is not a createClass helper
          Object.defineProperty(obj, key, { value: val });
          const prototype = obj.prototype;
          const enumerable = true;
          const configurable = true;
          // make it long
          let dummy = 1;
          dummy++; dummy++; dummy++; dummy++; dummy++; dummy++; dummy++; dummy++; dummy++; dummy++; dummy++;
          return dummy;
        }
      `;
      const { node: nNode, src: nSrc } = getFirstNodeAndSource(negative);
      expect(fp.match(nNode, nSrc)).toBe(false);
    });

    // 5. babel:to-primitive
    it('should match babel:to-primitive positive and not negative', () => {
      const fp = fingerprints.get('babel:to-primitive')!;
      expect(fp).toBeDefined();

      const positive = `
        function _toPrimitive(input) {
          if (Symbol.toPrimitive) {
            throw new TypeError("@@toPrimitive must return a primitive value.");
          }
        }
      `;
      const { node, src } = getFirstNodeAndSource(positive);
      expect(fp.match(node, src)).toBe(true);

      const negative = `
        function toPrimitiveFallback(input) {
          return String(input);
        }
      `;
      const { node: nNode, src: nSrc } = getFirstNodeAndSource(negative);
      expect(fp.match(nNode, nSrc)).toBe(false);
    });

    // 6. babel:to-property-key
    it('should match babel:to-property-key positive and not negative', () => {
      const fp = fingerprints.get('babel:to-property-key')!;
      expect(fp).toBeDefined();

      const positive = `
        function _toPropertyKey(arg) {
          var key = Symbol.toPrimitive ? "symbol" : "string";
          return key;
        }
      `;
      const { node, src } = getFirstNodeAndSource(positive);
      expect(fp.match(node, src)).toBe(true);

      const negative = `
        function makeKey(arg) {
          let longCheck = Symbol.toPrimitive ? "symbol" : "string";
          // long function check
          let a = 1;
          a++; a++; a++; a++; a++; a++; a++; a++; a++; a++; a++; a++; a++; a++;
          return longCheck + a;
        }
      `;
      const { node: nNode, src: nSrc } = getFirstNodeAndSource(negative);
      expect(fp.match(nNode, nSrc)).toBe(false);
    });

    // 7. babel:async-to-generator
    it('should match babel:async-to-generator positive and not negative', () => {
      const fp = fingerprints.get('babel:async-to-generator')!;
      expect(fp).toBeDefined();

      const positive = `
        function _asyncToGenerator(fn) {
          return function() {
            var self = this, args = arguments;
            return new Promise(function(resolve, reject) {
              var gen = fn.apply(self, args);
              function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); }
              function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); }
              _next(undefined);
            });
          };
        }
      `;
      const { node, src } = getFirstNodeAndSource(positive);
      expect(fp.match(node, src)).toBe(true);

      const negative = `
        function appAsyncRunner(fn) {
          // App-logic runner that uses promises but isn't the generator wrapper itself
          return Promise.resolve(42);
        }
      `;
      const { node: nNode, src: nSrc } = getFirstNodeAndSource(negative);
      expect(fp.match(nNode, nSrc)).toBe(false);
    });

    // 8. babel:object-spread
    it('should match babel:object-spread positive and not negative', () => {
      const fp = fingerprints.get('babel:object-spread')!;
      expect(fp).toBeDefined();

      const positive = `
        function _objectSpread2(target) {
          Object.defineProperties(target, Object.getOwnPropertyDescriptors({}));
        }
      `;
      const { node, src } = getFirstNodeAndSource(positive);
      expect(fp.match(node, src)).toBe(true);

      const negative = `
        function mergeObjects(target, source) {
          // Normal app logic using spread, not the specific descriptors loop
          return { ...target, ...source };
        }
      `;
      const { node: nNode, src: nSrc } = getFirstNodeAndSource(negative);
      expect(fp.match(nNode, nSrc)).toBe(false);
    });

    // 9. babel:define-property
    it('should match babel:define-property positive and not negative', () => {
      const fp = fingerprints.get('babel:define-property')!;
      expect(fp).toBeDefined();

      const positive = `
        function _defineProperty(obj, key, value) {
          Object.defineProperty(obj, key, {
            value: value,
            enumerable: true,
            configurable: true,
            writable: true
          });
        }
      `;
      const { node, src } = getFirstNodeAndSource(positive);
      expect(fp.match(node, src)).toBe(true);

      const negative = `
        function addKey(obj, key, val) {
          obj[key] = val;
          // make it long
          let dummy = 1;
          dummy++; dummy++; dummy++; dummy++; dummy++; dummy++; dummy++; dummy++; dummy++; dummy++; dummy++;
          return obj;
        }
      `;
      const { node: nNode, src: nSrc } = getFirstNodeAndSource(negative);
      expect(fp.match(nNode, nSrc)).toBe(false);
    });

    // 10. webpack:runtime-bootstrap
    it('should match webpack:runtime-bootstrap positive and not negative', () => {
      const fp = fingerprints.get('webpack:runtime-bootstrap')!;
      expect(fp).toBeDefined();

      const positive = `
        function bootstrap() {
          var modules = {};
          function __webpack_require__(moduleId) {
            return modules[moduleId].call();
          }
        }
      `;
      const { node, src } = getFirstNodeAndSource(positive);
      expect(fp.match(node, src)).toBe(true);

      const negative = `
        function loadModule(name) {
          return "Loaded module " + name;
        }
      `;
      const { node: nNode, src: nSrc } = getFirstNodeAndSource(negative);
      expect(fp.match(nNode, nSrc)).toBe(false);
    });

    // 11. bundler:esm-interop
    it('should match bundler:esm-interop positive and not negative', () => {
      const fp = fingerprints.get('bundler:esm-interop')!;
      expect(fp).toBeDefined();

      const positive = `
        function _interopRequireDefault(obj) {
          Object.defineProperty(obj, "__esModule", { value: true });
        }
      `;
      const { node, src } = getFirstNodeAndSource(positive);
      expect(fp.match(node, src)).toBe(true);

      const negative = `
        function setAppModule(obj) {
          // Long function setting property
          obj.isModule = true;
          let a = 1;
          a++; a++; a++; a++; a++; a++; a++; a++; a++; a++; a++; a++; a++; a++;
          return obj;
        }
      `;
      const { node: nNode, src: nSrc } = getFirstNodeAndSource(negative);
      expect(fp.match(nNode, nSrc)).toBe(false);
    });
  });
});
