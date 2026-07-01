import { describe, it, expect } from 'vitest';
import { BabelASTService } from '../src/services/ast/babel-core.js';
import { LLMRenameService, LLMProvider } from '../src/services/llm/rename-service.js';

describe('RenameService', () => {
  const astService = new BabelASTService();

  it('should rename identifiers using a mocked LLM provider', async () => {
    // Mock LLM provider
    const mockLLMProvider: LLMProvider = {
      async rename(name: string, context: string): Promise<string> {
        if (name === 'a') {
          return 'renamedA';
        }
        return name;
      }
    };

    const renameService = new LLMRenameService(astService, mockLLMProvider);
    
    const rawCode = 'function test(a) { return a + 1; }';
    const ast = astService.parseCode(rawCode);

    const metrics = await renameService.renameIdentifiers(ast, rawCode);

    expect(metrics.renamedCount).toBe(1);

    const finalCode = astService.generateCode(ast);
    expect(finalCode).toContain('renamedA');
    expect(finalCode).not.toContain('(a)');
  });
});
