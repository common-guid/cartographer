import { describe, it, expect } from 'vitest';
import { BabelASTService } from '../src/services/ast/babel-core.js';
import { countObfuscatedIdentifiers } from '../src/services/boilerplate/identifier-counter.js';

describe('countObfuscatedIdentifiers', () => {
  const astService = new BabelASTService();

  it('should count obfuscated identifiers correctly', () => {
    const code = `
      function a(x, y) {
        const b = x + y;
        const longDescriptiveName = 42;
        const c1 = b * 2;
        return c1;
      }
    `;
    const ast = astService.parseCode(code);
    const count = countObfuscatedIdentifiers(ast);

    // Short identifiers: a, x, y, b, c1
    // longDescriptiveName is long and is not classified as obfuscated.
    expect(count).toBe(5);
  });

  it('should return 0 for clean/unobfuscated code', () => {
    const code = `
      function calculateTotal(items, taxRate) {
        const subtotal = items.reduce((acc, item) => acc + item.price, 0);
        const totalAmount = subtotal * (1 + taxRate);
        return totalAmount;
      }
    `;
    const ast = astService.parseCode(code);
    const count = countObfuscatedIdentifiers(ast);
    expect(count).toBe(0);
  });
});
