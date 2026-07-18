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

  it('should not classify large try/catch structures as short functions or boilerplate', () => {
    // A dummy try-catch representing application logic that contains common boilerplate strings
    const code = `
      try {
        const dummy = Promise.resolve;
        const x = dummy.value;
        const y = dummy.done;
        // Add 12+ statements to make it definitely not a short function/block
        let a = 1;
        a = a + 1;
        a = a + 2;
        a = a + 3;
        a = a + 4;
        a = a + 5;
        a = a + 6;
        a = a + 7;
        a = a + 8;
        a = a + 9;
        a = a + 10;
        a = a + 11;
        a = a + 12;
        a = a + 13;
        a = a + 14;
        a = a + 15;
      } catch (err) {
        throw err;
      }
    `;
    const ast = astService.parseCode(code);
    const result = classifier.classify(ast, code);

    // The single TryStatement should be classified as 'app'
    expect(result.stats.totalNodes).toBe(1);
    expect(result.stats.boilerplateNodes).toBe(0);
    expect(result.stats.appNodes).toBe(1);
    expect(result.classifiedNodes[0].classification).toBe('app');
  });
});

