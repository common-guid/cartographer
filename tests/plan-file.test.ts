import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { PipelineOrchestrator } from '../src/cli/orchestrator.js';

describe('PipelineOrchestrator.planFile', () => {
  const fixturePath = path.join(process.cwd(), 'fixtures/webpack-hello-world/dist/bundle.js');

  it('should compile and return a correctly formatted FilePlan object', async () => {
    const orchestrator = new PipelineOrchestrator({
      useSanitizer: true,
      useHeuristicNaming: true,
      useLLMRename: true,
      useBoilerplateFilter: true,
    });

    const plan = await orchestrator.planFile(fixturePath, 'bundle.js');

    expect(plan).toBeDefined();
    expect(plan.filepath).toBe(fixturePath);
    expect(plan.relativePath).toBe('bundle.js');
    expect(plan.originalSize).toBeGreaterThan(0);
    expect(plan.sanitizedSize).toBeGreaterThan(0);
    expect(plan.appCodeSize).toBeGreaterThan(0);
    expect(plan.appCodeSize).toBeLessThan(plan.sanitizedSize);
    expect(plan.boilerplateFilteredRatio).toBeGreaterThan(0.5);
    expect(plan.boilerplateFilteredRatio).toBeLessThan(1.0);
    expect(plan.estimatedTokens).toBeGreaterThan(0);
    expect(plan.requests).toBe(1);
  });

  it('should return estimatedTokens: 0 and requests: 0 when useLLMRename is false (heuristic)', async () => {
    const orchestrator = new PipelineOrchestrator({
      useSanitizer: true,
      useHeuristicNaming: true,
      useLLMRename: false, // heuristic
      useBoilerplateFilter: true,
    });

    const plan = await orchestrator.planFile(fixturePath, 'bundle.js');

    expect(plan.appCodeSize).toBe(0);
    expect(plan.estimatedTokens).toBe(0);
    expect(plan.requests).toBe(0);
  });

  it('should report correct appCodeSize and boilerplateFilteredRatio for webpack-hello-world', async () => {
    const orchestrator = new PipelineOrchestrator({
      useSanitizer: true,
      useHeuristicNaming: true,
      useLLMRename: true,
      useBoilerplateFilter: true,
    });

    const plan = await orchestrator.planFile(fixturePath, 'bundle.js');

    // From extractor.test results:
    // Clean code size: ~19074, Extracted app code size: ~4864, ratio: ~0.745
    expect(plan.appCodeSize).toBeCloseTo(4864, -2); // approximate check (+/- 100 chars)
    expect(plan.boilerplateFilteredRatio).toBeCloseTo(0.745, 1); // approximate check (+/- 0.05)
  });
});
