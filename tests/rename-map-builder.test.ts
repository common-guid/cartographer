import { describe, it, expect } from 'vitest';
import { BabelASTService } from '../src/services/ast/babel-core.js';
import { RenameMapBuilder } from '../src/services/boilerplate/rename-map-builder.js';

describe('RenameMapBuilder', () => {
  const astService = new BabelASTService();
  const builder = new RenameMapBuilder();

  it('should build correct mappings when names change and ignore unchanged', () => {
    const originalCode = 'function process(x, y) { return x + y; }';
    const renamedCode = 'function renamedProcess(renamedX, y) { return renamedX + y; }';

    const origAST = astService.parseCode(originalCode);
    const renamedAST = astService.parseCode(renamedCode);

    const map = builder.build(origAST, renamedAST);

    expect(map.size).toBe(2);
    expect(map.get('process')).toBe('renamedProcess');
    expect(map.get('x')).toBe('renamedX');
    expect(map.get('y')).toBeUndefined(); // unchanged
  });

  it('should return empty map for identical ASTs', () => {
    const code = 'function process(x, y) { return x + y; }';
    const origAST = astService.parseCode(code);
    const renamedAST = astService.parseCode(code);

    const map = builder.build(origAST, renamedAST);
    expect(map.size).toBe(0);
  });

  it('should warn on conflict with boilerplate names but not throw', () => {
    const originalCode = 'function process(x) { return x; }';
    const renamedCode = 'function renamedProcess(t) { return t; }'; // 't' is common in boilerplate

    const origAST = astService.parseCode(originalCode);
    const renamedAST = astService.parseCode(renamedCode);

    const boilerplateNames = new Set(['t', 'n']);
    
    // Capture console.warn to verify warning was logged
    let warned = false;
    const originalWarn = console.warn;
    console.warn = (...args) => {
      warned = true;
      originalWarn(...args);
    };

    try {
      const map = builder.build(origAST, renamedAST, boilerplateNames);
      expect(map.size).toBe(2);
      expect(map.get('x')).toBe('t');
      expect(warned).toBe(true);
    } finally {
      console.warn = originalWarn;
    }
  });
});
