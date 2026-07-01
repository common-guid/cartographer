import { describe, it, expect } from 'vitest';
import { WakaruSanitizer } from '../src/services/sanitizer/wakaru-service.js';

describe('WakaruSanitizer', () => {
  it('should split sequence expressions', async () => {
    const sanitizer = new WakaruSanitizer();
    const rawCode = 'a = 1, b = 2;';
    const result = await sanitizer.sanitize(rawCode, 'test.js');
    expect(result).toContain('a = 1;');
    expect(result).toContain('b = 2;');
  });

  it('should split variable declarations (variable merging)', async () => {
    const sanitizer = new WakaruSanitizer();
    const rawCode = 'var a = 1, b = 2;';
    const result = await sanitizer.sanitize(rawCode, 'test.js');
    expect(result).toContain('var a = 1;');
    expect(result).toContain('var b = 2;');
  });

  it('should respect the enabled flag', async () => {
    const sanitizer = new WakaruSanitizer({ enabled: false });
    const rawCode = 'a = 1, b = 2;';
    const result = await sanitizer.sanitize(rawCode, 'test.js');
    expect(result.trim()).toBe(rawCode);
  });
});
