import { createRequire } from 'module';
import prettier from 'prettier';
import { STRUCTURAL_RULES, HEURISTIC_RULES } from './rules.js';
import { CodeTransformer, SanitizerConfig, TransformationResult } from './types.js';

const require = createRequire(import.meta.url);
const { runTransformationRules } = require('@wakaru/unminify');

export class WakaruSanitizer implements CodeTransformer {
  name = 'Wakaru Syntax Sanitizer';
  private config: SanitizerConfig;

  constructor(config: Partial<SanitizerConfig> = {}) {
    this.config = {
      enabled: true,
      useHeuristicNaming: true,
      ...config
    };
  }

  async transform(code: string, filepath: string): Promise<TransformationResult> {
    if (!this.config.enabled) {
      return { code };
    }

    const originalLength = code.length;
    const activeRules = [...STRUCTURAL_RULES];
    if (this.config.useHeuristicNaming) {
      activeRules.push(...HEURISTIC_RULES);
    }

    try {
      const result = await runTransformationRules({
        path: filepath,
        source: code,
      }, activeRules);

      let cleanCode = result.code;

      if (this.config.useHeuristicNaming) {
        const newLength = cleanCode.length;
        const savings = originalLength - newLength;
        const savingsPercent = originalLength > 0 ? ((savings / originalLength) * 100).toFixed(1) : '0';
        if (savings > 0) {
          console.log(`[Sanitizer] ⚡ Optimized size by ${savingsPercent}% (${savings} chars) via static analysis.`);
        }
      }

      // Format code via Prettier
      try {
        cleanCode = await prettier.format(cleanCode, {
          parser: 'babel',
          semi: true,
          singleQuote: true,
          trailingComma: 'es5',
        });
      } catch (prettierError) {
        // Safe fallback
      }

      return {
        code: cleanCode,
        map: result.sourceMap,
      };
    } catch (error) {
      console.warn(`[Sanitizer] ⚠️ Failed to sanitize ${filepath}. Proceeding with raw code.`);
      console.warn(`[Sanitizer] Error details:`, error);
      return { code };
    }
  }

  async sanitize(rawCode: string, filepath: string): Promise<string> {
    const res = await this.transform(rawCode, filepath);
    return res.code;
  }
}
