import { describe, it, expect } from 'vitest';
import { BabelASTService } from '../src/services/ast/babel-core.js';
import { Reintegrator } from '../src/services/boilerplate/reintegrator.js';

describe('Reintegrator', () => {
  const astService = new BabelASTService();
  const reintegrator = new Reintegrator();

  it('should apply renames, keep structure, not mutate original, and handle cross references', () => {
    // A simulated bundle containing boilerplate and app logic.
    // boilerplateHelper calls appFunction.
    const originalCode = `
      function boilerplateHelper(t) {
        return appFunction(t);
      }
      function appFunction(x) {
        return x + 1;
      }
    `;

    const fullAST = astService.parseCode(originalCode);
    
    // We want to rename appFunction to renamedAppFunction, and x to renamedX.
    // We do NOT want to rename boilerplateHelper or t.
    const renameMap = new Map([
      ['appFunction', 'renamedAppFunction'],
      ['x', 'renamedX']
    ]);

    // Keep track of original ast structure for mutation check
    const originalGenerated = astService.generateCode(fullAST);

    // Reintegrate
    const mergedAST = reintegrator.reintegrate(fullAST, renameMap);
    
    // Generate output
    const output = astService.generateCode(mergedAST);

    // 1. Success criteria: original names no longer present
    expect(output).not.toContain('appFunction');
    expect(output).not.toContain('(x)');

    // 2. Success criteria: renamed names DO appear
    expect(output).toContain('renamedAppFunction');
    expect(output).toContain('renamedX');

    // 3. Success criteria: boilerplateHelper and t remain unchanged
    expect(output).toContain('boilerplateHelper');
    expect(output).toContain('(t)');

    // 4. Success criteria: output is valid syntax
    const reparsed = astService.parseCode(output);
    expect(reparsed).toBeDefined();

    // 5. Success criteria: does not mutate original AST
    const originalGeneratedAfter = astService.generateCode(fullAST);
    expect(originalGeneratedAfter).toBe(originalGenerated);
  });

  it('should handle empty rename map correctly', () => {
    const code = 'function test(a) { return a; }';
    const fullAST = astService.parseCode(code);
    const originalGenerated = astService.generateCode(fullAST);

    const mergedAST = reintegrator.reintegrate(fullAST, new Map());
    const output = astService.generateCode(mergedAST);

    expect(output).toBe(originalGenerated);
  });
});
