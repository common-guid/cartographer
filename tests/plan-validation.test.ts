import { describe, it, expect } from 'vitest';
import path from 'node:path';
import fs from 'node:fs/promises';
import { PipelineOrchestrator } from '../src/cli/orchestrator.js';
import { HUMANIFY_CONTEXT_SIZE_TOKENS } from '../src/config/constants.js';

describe('Success Criteria Plan Validation Tests', () => {
  const fixturePath = path.join(process.cwd(), 'fixtures/webpack-hello-world/dist/bundle.js');

  // SC-3: plan token estimate is non-trivially larger than old value
  it('SC-3: should estimate tokens based on unique identifiers and context size', async () => {
    const orchestrator = new PipelineOrchestrator({
      useSanitizer: true,
      useHeuristicNaming: true,
      useLLMRename: true,
      useBoilerplateFilter: true,
    });

    const plan = await orchestrator.planFile(fixturePath, 'bundle.js');
    expect(plan.requests).toBeGreaterThan(1);
    expect(plan.estimatedTokens).toBeGreaterThan(10000);
    expect(plan.estimatedTokens).toBe(plan.requests * HUMANIFY_CONTEXT_SIZE_TOKENS);
  });

  // SC-5: --no-boilerplate-filter fallback / option still produces valid estimate
  it('SC-5: should produce higher or equal requests when boilerplate filter is disabled', async () => {
    const orchestratorWithFilter = new PipelineOrchestrator({
      useSanitizer: true,
      useHeuristicNaming: true,
      useLLMRename: true,
      useBoilerplateFilter: true,
    });

    const orchestratorWithoutFilter = new PipelineOrchestrator({
      useSanitizer: true,
      useHeuristicNaming: true,
      useLLMRename: true,
      useBoilerplateFilter: false,
    });

    const planWith = await orchestratorWithFilter.planFile(fixturePath, 'bundle.js');
    const planWithout = await orchestratorWithoutFilter.planFile(fixturePath, 'bundle.js');

    expect(planWithout.requests).toBeGreaterThanOrEqual(planWith.requests);
    expect(planWithout.requests).toBeGreaterThan(0);
  });

  // SC-6: Verify that HUMANIFY_CONTEXT_SIZE_TOKENS is imported and used, and the literal 2000 is not hardcoded in orchestrator or humanify-service
  it('SC-6: should not contain hardcoded context-size literal 2000', async () => {
    const orchestratorFilePath = path.join(process.cwd(), 'src/cli/orchestrator.ts');
    const humanifyServiceFilePath = path.join(process.cwd(), 'src/services/llm/humanify-service.ts');

    const orchestratorContent = await fs.readFile(orchestratorFilePath, 'utf-8');
    const humanifyServiceContent = await fs.readFile(humanifyServiceFilePath, 'utf-8');

    // Make sure they don't contain '--context-size', '2000' or similar hardcoded lines
    expect(orchestratorContent).not.toMatch(/context-size.*2000|2000.*context-size|= 2000\b/);
    expect(humanifyServiceContent).not.toMatch(/context-size.*2000|2000.*context-size|= 2000\b/);
  });
});
