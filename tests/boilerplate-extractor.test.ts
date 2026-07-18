import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { BabelASTService } from '../src/services/ast/babel-core.js';
import { WakaruSanitizer } from '../src/services/sanitizer/wakaru-service.js';
import { BoilerplateClassifier } from '../src/services/boilerplate/classifier.js';
import { AppCodeExtractor } from '../src/services/boilerplate/extractor.js';

describe('AppCodeExtractor', () => {
  const astService = new BabelASTService();
  const sanitizer = new WakaruSanitizer({ enabled: true, useHeuristicNaming: true });
  const classifier = new BoilerplateClassifier();
  const extractor = new AppCodeExtractor();

  it('should extract app code correctly from webpack-hello-world', async () => {
    const fixturePath = path.join(process.cwd(), 'fixtures/webpack-hello-world/dist/bundle.js');
    const rawCode = await fs.readFile(fixturePath, 'utf-8');

    // 1. Sanitize using Wakaru
    const cleanCode = await sanitizer.sanitize(rawCode, fixturePath);
    expect(cleanCode).toBeDefined();

    // 2. Parse using Babel
    const ast = astService.parseCode(cleanCode);

    // 3. Classify
    const filterResult = classifier.classify(ast, cleanCode);

    // 4. Extract
    const { appCode, appAST } = extractor.extract(ast, filterResult);

    expect(appCode).toBeDefined();
    expect(appAST).toBeDefined();

    // Success Criteria: Parseable by Babel
    const reparsed = astService.parseCode(appCode);
    expect(reparsed).toBeDefined();
    expect(reparsed.type).toBe('File');

    // Success Criteria: Contains all app-logic function names
    // Note that after Wakaru, they might have their minified/unminified names
    // Let's verify some key substring presence
    // These functions correspond to what Webpack minifies the original functions to
    expect(appCode).toContain('var t');
    expect(appCode).toContain('var n');
    expect(appCode).toContain('var e');
    expect(appCode).toContain('function r');

    // Success Criteria: Does NOT contain known boilerplate fingerprint literals
    expect(appCode).not.toContain('"@@iterator"');
    expect(appCode).not.toContain('"GeneratorFunction"');
    expect(appCode).not.toContain('"Cannot call a class as a function"');
    expect(appCode).not.toContain('__webpack_require__');

    // Success Criteria: Character length strictly less than cleanCode
    expect(appCode.length).toBeLessThan(cleanCode.length);
    console.log(`[Test] Clean code size: ${cleanCode.length} chars, Extracted app code size: ${appCode.length} chars. Reduction: ${((1 - appCode.length / cleanCode.length) * 100).toFixed(1)}%`);
  });

  it('should handle edge case: all nodes classified as app', () => {
    const code = 'function add(a, b) { return a + b; }';
    const ast = astService.parseCode(code);
    const filterResult = classifier.classify(ast, code);
    
    // Force all classified as app
    for (const node of filterResult.classifiedNodes) {
      node.classification = 'app';
    }

    const { appCode } = extractor.extract(ast, filterResult);
    expect(appCode.trim().replace(/\s+/g, '')).toBe('functionadd(a,b){returna+b;}');
  });

  it('should handle edge case: all nodes classified as boilerplate', () => {
    const code = 'function add(a, b) { return a + b; }';
    const ast = astService.parseCode(code);
    const filterResult = classifier.classify(ast, code);
    
    // Force all classified as boilerplate
    for (const node of filterResult.classifiedNodes) {
      node.classification = 'boilerplate';
    }

    const { appCode } = extractor.extract(ast, filterResult);
    expect(appCode.trim()).toBe('');
  });
});
