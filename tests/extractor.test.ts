import { describe, it, expect } from 'vitest';
import { BabelASTService } from '../src/services/ast/babel-core.js';
import { ASTExtractorService } from '../src/services/graph/extractor-service.js';

describe('ASTExtractorService', () => {
  const astService = new BabelASTService();
  const extractor = new ASTExtractorService(astService);

  it('should extract imports, exports, defined functions, calls, and api sinks', () => {
    const rawCode = `
      import { util } from './utils.js';
      
      export function processData(a) {
        util();
        fetch('/api/v1/data', { method: 'POST' });
        return a;
      }
      
      const internalHelper = () => {
        processData(1);
      };
    `;

    const ast = astService.parseCode(rawCode);
    const metadata = extractor.extractMetadata(ast, 'src/main.js');

    // 1. Assert file ID
    expect(metadata.id).toBe('src/main.js');

    // 2. Assert imports
    expect(metadata.imports).toContain('./utils.js');

    // 3. Assert exports
    expect(metadata.exports).toContain('processData');

    // 4. Assert defined functions
    const funcNames = metadata.definedFunctions.map(f => f.name);
    expect(funcNames).toContain('processData');
    expect(funcNames).toContain('internalHelper');

    // 5. Assert calls
    const callTargets = metadata.calls.map(c => c.to);
    expect(callTargets).toContain('util');
    expect(callTargets).toContain('processData');

    // Assert call types
    const utilCall = metadata.calls.find(c => c.to === 'util');
    expect(utilCall).toBeDefined();
    expect(utilCall!.type).toBe('external'); // imported

    const localCall = metadata.calls.find(c => c.to === 'processData');
    expect(localCall).toBeDefined();
    expect(localCall!.type).toBe('internal');

    // 6. Assert API sinks
    expect(metadata.apiSinks.length).toBe(1);
    expect(metadata.apiSinks[0].method).toBe('POST');
    expect(metadata.apiSinks[0].urlPattern).toBe('/api/v1/data');
  });
});
