import { ASTService } from '../ast/babel-core.js';
import { shouldRename } from './identifier-filter.js';

export interface LLMProvider {
  rename(name: string, context: string): Promise<string>;
}

export interface RenameMetrics {
  processedCount: number;
  renamedCount: number;
}

export class LLMRenameService {
  constructor(
    private astService: ASTService,
    private llmProvider: LLMProvider
  ) {}

  async renameIdentifiers(ast: any, originalCode: string): Promise<RenameMetrics> {
    const bindingMap = new Map<any, { name: string; scope: any; blockLength: number }>();
    
    // Pass 1: Extract all bindings
    this.astService.traverseAst(ast, {
      Scope(path: any) {
        const scope = path.scope;
        const block = path.node;
        const blockLength = (block.end ?? 0) - (block.start ?? 0);
        for (const [name, binding] of Object.entries(scope.bindings)) {
          if (!bindingMap.has(binding)) {
            bindingMap.set(binding, { name, scope, blockLength });
          }
        }
      }
    });

    const bindingsList = Array.from(bindingMap.values());
    // Sort in descending order of scope size (outer-to-inner)
    bindingsList.sort((a, b) => b.blockLength - a.blockLength);

    let processedCount = 0;
    let renamedCount = 0;

    for (const binding of bindingsList) {
      processedCount++;
      if (!shouldRename(binding.name)) {
        continue;
      }

      // Extract context around the scope block
      const start = binding.scope.block.start ?? 0;
      const end = binding.scope.block.end ?? originalCode.length;
      const context = originalCode.substring(start, end);

      try {
        // Query the LLM provider
        const suggestedName = await this.llmProvider.rename(binding.name, context);
        if (suggestedName && suggestedName !== binding.name) {
          // Normalize and prevent collisions
          let finalName = suggestedName.replace(/[^a-zA-Z0-9_$]/g, '');
          if (!/^[a-zA-Z_$]/.test(finalName)) {
            finalName = 'var_' + finalName;
          }

          // Ensure it's not a JavaScript reserved keyword
          if (isReservedKeyword(finalName)) {
            finalName = '_' + finalName;
          }

          while (binding.scope.hasBinding(finalName) || binding.scope.hasGlobal(finalName)) {
            finalName = '_' + finalName;
          }

          this.astService.renameBinding(binding.scope, binding.name, finalName);
          renamedCount++;
        }
      } catch (error) {
        console.warn(`[RenameService] Failed to rename identifier ${binding.name}:`, error);
      }
    }

    return { processedCount, renamedCount };
  }
}

function isReservedKeyword(word: string): boolean {
  const keywords = new Set([
    'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger',
    'default', 'delete', 'do', 'else', 'export', 'extends', 'finally',
    'for', 'function', 'if', 'import', 'in', 'instanceof', 'new', 'return',
    'super', 'switch', 'this', 'throw', 'try', 'typeof', 'var', 'void',
    'while', 'with', 'yield', 'let', 'static', 'enum', 'await', 'implements',
    'package', 'protected', 'interface', 'private', 'public'
  ]);
  return keywords.has(word);
}
