import fs from 'node:fs/promises';
import path from 'node:path';
import { file, program } from '@babel/types';
import { InteractionContext } from '../observability/tracer.js';
import { BabelASTService } from '../services/ast/babel-core.js';
import { WakaruSanitizer } from '../services/sanitizer/wakaru-service.js';
import { HumanifyService } from '../services/llm/humanify-service.js';
import { ASTExtractorService } from '../services/graph/extractor-service.js';
import { BoilerplateClassifier } from '../services/boilerplate/classifier.js';
import { AppCodeExtractor } from '../services/boilerplate/extractor.js';
import { RenameMapBuilder } from '../services/boilerplate/rename-map-builder.js';
import { Reintegrator } from '../services/boilerplate/reintegrator.js';
import type { FilePlan } from '../services/boilerplate/types.js';
import { countObfuscatedIdentifiers } from '../services/boilerplate/identifier-counter.js';
import { HUMANIFY_CONTEXT_SIZE_TOKENS } from '../config/constants.js';

export interface OrchestratorConfig {
  outputDir: string;
  useSanitizer: boolean;
  useHeuristicNaming: boolean;
  useLLMRename: boolean;
  useBoilerplateFilter: boolean;
}

export class PipelineOrchestrator {
  private astService = new BabelASTService();
  private sanitizer: WakaruSanitizer;
  private extractor = new ASTExtractorService();
  private config: OrchestratorConfig;
  private humanifyService = new HumanifyService();
  private interaction?: InteractionContext;

  constructor(
    config: Partial<OrchestratorConfig> = {}
  ) {
    this.config = {
      outputDir: './dist-output',
      useSanitizer: true,
      useHeuristicNaming: true,
      useLLMRename: true,
      useBoilerplateFilter: process.env.BOILERPLATE_FILTER_ENABLED !== 'false',
      ...config
    };
    this.sanitizer = new WakaruSanitizer({
      enabled: this.config.useSanitizer,
      useHeuristicNaming: this.config.useHeuristicNaming
    });
  }

  setInteraction(interaction: InteractionContext) {
    this.interaction = interaction;
  }

  async processFile(filepath: string, relativePath: string): Promise<string> {
    const run = async () => {
      console.log(`[Orchestrator] Processing: ${filepath} (${relativePath})`);
      
      // 1. Read raw file code
      const rawCode = await fs.readFile(filepath, 'utf-8');

      // 2. Wakaru Sanitization (String -> String)
      const sanitized = await (this.interaction
        ? this.interaction.withSpan(
            {
              name: 'sanitize',
              properties: { filepath: relativePath },
              inputParameters: [rawCode.length],
            },
            async () => this.sanitizer.transform(rawCode, filepath)
          )
        : this.sanitizer.transform(rawCode, filepath));
      const cleanCode = sanitized.code;

      if (this.interaction) {
        this.interaction.addAttachments([
          {
            type: 'code',
            language: 'javascript',
            name: `${relativePath} (sanitized)`,
            value: cleanCode.substring(0, 2000),
            role: 'output',
          },
        ]);
      }

      // 3. Humanify LLM Renaming (String -> String)
      let renamedCode = cleanCode;
      if (this.config.useLLMRename) {
        if (this.config.useBoilerplateFilter) {
          try {
            const fullAST = this.astService.parseCode(cleanCode);
            const classifier = new BoilerplateClassifier();
            const filterResult = await (this.interaction
              ? this.interaction.withSpan(
                  { name: 'boilerplate_classify', properties: { filepath: relativePath } },
                  async () => classifier.classify(fullAST, cleanCode)
                )
              : classifier.classify(fullAST, cleanCode));

            console.log(
              `[Filter] ${filterResult.stats.boilerplateNodes}/${filterResult.stats.totalNodes} nodes classified as boilerplate. ~${filterResult.stats.estimatedTokensSaved.toLocaleString()} tokens saved.`
            );

            const extractor = new AppCodeExtractor();
            const { appCode, appAST } = await (this.interaction
              ? this.interaction.withSpan(
                  { name: 'app_code_extract', properties: { filepath: relativePath } },
                  async () => extractor.extract(fullAST, filterResult)
                )
              : extractor.extract(fullAST, filterResult));

            if (appCode.trim()) {
              const renamedAppCode = await this.humanifyService.rename(appCode, this.interaction);
              const renamedAppAST = this.astService.parseCode(renamedAppCode);

              // Collect boilerplate identifier names to check for conflicts
              const boilerplateNames = new Set<string>();
              for (const cn of filterResult.classifiedNodes) {
                if (cn.classification === 'boilerplate') {
                  // Wrap bare statements (e.g. FunctionDeclaration from getStatementsToProcess) in a File/Program
                  // so Babel traverse does not require explicit scope/parentPath.
                  const wrapped = file(program([cn.node as any]));
                  this.astService.traverseAst(wrapped, {
                    Identifier(path: any) {
                      boilerplateNames.add(path.node.name);
                    }
                  });
                }
              }

              const renameMap = new RenameMapBuilder().build(appAST, renamedAppAST, boilerplateNames);
              const mergedAST = new Reintegrator().reintegrate(fullAST, renameMap);
              renamedCode = this.astService.generateCode(mergedAST);
            } else {
              console.log('[Filter] No app logic nodes detected. Skipping renaming.');
              renamedCode = cleanCode;
            }
          } catch (filterError) {
            console.warn('[Filter] Boilerplate name collection failed; falling back to full file renaming.', filterError);
            renamedCode = await this.humanifyService.rename(cleanCode, this.interaction);
          }
        } else {
          renamedCode = await this.humanifyService.rename(cleanCode, this.interaction);
        }
      }

      // 4. AST Parsing of renamed code (String -> AST)
      const ast = this.astService.parseCode(renamedCode);

      // 5. Extract metadata from renamed AST (AST -> metadata)
      const metadata = await (this.interaction
        ? this.interaction.withSpan(
            { name: 'ast_extract', properties: { filepath: relativePath } },
            async () => this.extractor.extractMetadata(ast, relativePath)
          )
        : this.extractor.extractMetadata(ast, relativePath));

      // 6. Final code is the renamed code string
      const finalCode = renamedCode;

      // 7. Ensure output directory exists and write JS file + .metadata.json sidecar
      const outputPath = path.join(this.config.outputDir, relativePath);
      const metadataPath = outputPath + '.metadata.json';

      await (this.interaction
        ? this.interaction.withSpan(
            { name: 'write_output', properties: { outputPath, metadataPath } },
            async () => {
              await fs.mkdir(path.dirname(outputPath), { recursive: true });
              await fs.writeFile(outputPath, finalCode, 'utf-8');
              await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
            }
          )
        : (async () => {
            await fs.mkdir(path.dirname(outputPath), { recursive: true });
            await fs.writeFile(outputPath, finalCode, 'utf-8');
            await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
          })());

      console.log(`[Orchestrator] Saved processed output to ${outputPath}`);
      console.log(`[Orchestrator] Saved metadata to ${metadataPath}`);
      return finalCode;
    };

    if (this.interaction) {
      return this.interaction.withSpan(
        {
          name: 'process_file',
          properties: { file: relativePath },
          inputParameters: [filepath],
        },
        run
      );
    }
    return run();
  }

  async planFile(filepath: string, relativePath: string): Promise<FilePlan> {
    const rawCode = await fs.readFile(filepath, 'utf-8');
    
    // 1. Sanitization
    const sanitized = await this.sanitizer.transform(rawCode, filepath);
    const cleanCode = sanitized.code;

    let appCodeSize = cleanCode.length;
    let estimatedTokens = 0;
    let requests = 0;

    if (this.config.useLLMRename) {
      if (this.config.useBoilerplateFilter) {
        try {
          const fullAST = this.astService.parseCode(cleanCode);
          const classifier = new BoilerplateClassifier();
          const filterResult = classifier.classify(fullAST, cleanCode);
          const extractor = new AppCodeExtractor();
          const { appCode, appAST } = extractor.extract(fullAST, filterResult);
          appCodeSize = appCode.length;

          // Count unique obfuscated identifiers — this is the number of
          // rename calls humanify will make (one per unique identifier).
          requests = countObfuscatedIdentifiers(appAST);
        } catch (err) {
          // Fallback: if parsing/filtering fails, estimate from character count.
          // Use 1 request per ~80 chars as a rough per-identifier heuristic.
          appCodeSize = cleanCode.length;
          requests = Math.max(1, Math.ceil(cleanCode.length / 80));
        }
      } else {
        // No boilerplate filter: estimate identifiers from full clean code.
        try {
          const fullAST = this.astService.parseCode(cleanCode);
          requests = countObfuscatedIdentifiers(fullAST);
        } catch {
          requests = Math.max(1, Math.ceil(cleanCode.length / 80));
        }
      }

      // Token estimate: each humanify call uses up to HUMANIFY_CONTEXT_SIZE_TOKENS
      // tokens as its window. The total is bounded by the actual identifier count.
      estimatedTokens = requests * HUMANIFY_CONTEXT_SIZE_TOKENS;
    } else {
      appCodeSize = 0;
      requests = 0;
    }

    const boilerplateFilteredRatio = cleanCode.length > 0 
      ? (cleanCode.length - appCodeSize) / cleanCode.length 
      : 0;

    return {
      filepath,
      relativePath,
      originalSize: rawCode.length,
      sanitizedSize: cleanCode.length,
      appCodeSize,
      boilerplateFilteredRatio,
      estimatedTokens,
      requests,
    };
  }
}
