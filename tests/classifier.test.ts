import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { BabelASTService } from '../src/services/ast/babel-core.js';
import { WakaruSanitizer } from '../src/services/sanitizer/wakaru-service.js';
import { BoilerplateClassifier } from '../src/services/boilerplate/classifier.js';

describe('BoilerplateClassifier', () => {
  const astService = new BabelASTService();
  const sanitizer = new WakaruSanitizer({ enabled: true, useHeuristicNaming: true });
  const classifier = new BoilerplateClassifier();

  it('should classify webpack-hello-world correctly', async () => {
    const fixturePath = path.join(process.cwd(), 'fixtures/webpack-hello-world/dist/bundle.js');
    const rawCode = await fs.readFile(fixturePath, 'utf-8');

    // 1. Sanitize using Wakaru
    const cleanCode = await sanitizer.sanitize(rawCode, fixturePath);
    expect(cleanCode).toBeDefined();

    // 2. Parse using Babel
    const ast = astService.parseCode(cleanCode);

    // 3. Classify and measure performance
    const startTime = performance.now();
    const result = classifier.classify(ast, cleanCode);
    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log(`[Test] Classification completed in ${duration.toFixed(2)}ms`);
    expect(duration).toBeLessThan(100);

    // 4. Assert stats
    expect(result.stats.totalNodes).toBeGreaterThan(0);
    expect(result.stats.boilerplateNodes).toBeGreaterThanOrEqual(9);
    expect(result.stats.appNodes).toBeGreaterThan(0);
    expect(result.stats.estimatedTokensSaved).toBeGreaterThan(0);
    expect(result.appCodeRatio).toBeGreaterThan(0);
    expect(result.appCodeRatio).toBeLessThan(1);

    // 5. Check false positives on app logic
    const appNodes = result.classifiedNodes.filter(n => n.classification === 'app');
    const appNodeSources = appNodes.map(n => astService.generateCode(n.node));

    const expectedAppIdentifiers = [
      'add',
      'multiply',
      'circleArea',
      'clamp',
      'fetchUser', // or similar in bundle (g, fetchUser, fetchUser/g after wakaru)
      'fetchUsers', // (j, fetchUsers/j after wakaru)
      'Greeter', // or class equivalent
    ];

    // Verify none of the app-logic helper/functions are marked as boilerplate
    for (const appNode of result.classifiedNodes) {
      if (appNode.classification === 'boilerplate') {
        const src = astService.generateCode(appNode.node);
        // Ensure none of the expected app-logic functions are misclassified
        // We look for function definitions like: function add(...) or class Greeter
        expect(src).not.toMatch(/^\s*function\s+add\b/);
        expect(src).not.toMatch(/^\s*function\s+multiply\b/);
        expect(src).not.toMatch(/^\s*function\s+circleArea\b/);
        expect(src).not.toMatch(/^\s*function\s+clamp\b/);
        expect(src).not.toMatch(/class\s+Greeter\b/);
      }
    }
  });

  it('should not throw on an empty file/program body', () => {
    const emptyAst = astService.parseCode('');
    const result = classifier.classify(emptyAst, '');

    expect(result.stats.totalNodes).toBe(0);
    expect(result.stats.boilerplateNodes).toBe(0);
    expect(result.stats.appNodes).toBe(0);
    expect(result.appCodeRatio).toBe(1.0);
    expect(result.stats.estimatedTokensSaved).toBe(0);
  });
});
