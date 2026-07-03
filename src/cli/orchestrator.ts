import fs from 'node:fs/promises';
import path from 'node:path';
import { BabelASTService } from '../services/ast/babel-core.js';
import { WakaruSanitizer } from '../services/sanitizer/wakaru-service.js';
import { HumanifyService } from '../services/llm/humanify-service.js';
import { ASTExtractorService } from '../services/graph/extractor-service.js';
import { BoilerplateClassifier } from '../services/boilerplate/classifier.js';
import { AppCodeExtractor } from '../services/boilerplate/extractor.js';
import { RenameMapBuilder } from '../services/boilerplate/rename-map-builder.js';
import { Reintegrator } from '../services/boilerplate/reintegrator.js';

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

  async processFile(filepath: string, relativePath: string): Promise<string> {
    console.log(`[Orchestrator] Processing: ${filepath} (${relativePath})`);
    
    // 1. Read raw file code
    const rawCode = await fs.readFile(filepath, 'utf-8');

    // 2. Wakaru Sanitization (String -> String)
    const sanitized = await this.sanitizer.transform(rawCode, filepath);
    const cleanCode = sanitized.code;

    // 3. Humanify LLM Renaming (String -> String)
    let renamedCode = cleanCode;
    if (this.config.useLLMRename) {
      if (this.config.useBoilerplateFilter) {
        try {
          const fullAST = this.astService.parseCode(cleanCode);
          const classifier = new BoilerplateClassifier();
          const filterResult = classifier.classify(fullAST, cleanCode);

          console.log(
            `[Filter] ${filterResult.stats.boilerplateNodes}/${filterResult.stats.totalNodes} nodes classified as boilerplate. ~${filterResult.stats.estimatedTokensSaved.toLocaleString()} tokens saved.`
          );

          const extractor = new AppCodeExtractor();
          const { appCode, appAST } = extractor.extract(fullAST, filterResult);

          if (appCode.trim()) {
            const renamedAppCode = await this.humanifyService.rename(appCode);
            const renamedAppAST = this.astService.parseCode(renamedAppCode);

            // Collect boilerplate identifier names to check for conflicts
            const boilerplateNames = new Set<string>();
            for (const cn of filterResult.classifiedNodes) {
              if (cn.classification === 'boilerplate') {
                this.astService.traverseAst(cn.node as any, {
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
          console.warn('[Filter] Boilerplate filter failed. Falling back to full file renaming.', filterError);
          renamedCode = await this.humanifyService.rename(cleanCode);
        }
      } else {
        renamedCode = await this.humanifyService.rename(cleanCode);
      }
    }

    // 4. AST Parsing of renamed code (String -> AST)
    const ast = this.astService.parseCode(renamedCode);

    // 5. Extract metadata from renamed AST (AST -> metadata)
    const metadata = this.extractor.extractMetadata(ast, relativePath);

    // 6. Final code is the renamed code string
    const finalCode = renamedCode;

    // 7. Ensure output directory exists and write JS file + .metadata.json sidecar
    const outputPath = path.join(this.config.outputDir, relativePath);
    const metadataPath = outputPath + '.metadata.json';

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, finalCode, 'utf-8');
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');

    console.log(`[Orchestrator] Saved processed output to ${outputPath}`);
    console.log(`[Orchestrator] Saved metadata to ${metadataPath}`);
    return finalCode;
  }
}
