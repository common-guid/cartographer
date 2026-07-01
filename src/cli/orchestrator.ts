import fs from 'node:fs/promises';
import path from 'node:path';
import { BabelASTService } from '../services/ast/babel-core.js';
import { WakaruSanitizer } from '../services/sanitizer/wakaru-service.js';
import { HumanifyService } from '../services/llm/humanify-service.js';
import { ASTExtractorService } from '../services/graph/extractor-service.js';

export interface OrchestratorConfig {
  outputDir: string;
  useSanitizer: boolean;
  useHeuristicNaming: boolean;
  useLLMRename: boolean;
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
      renamedCode = await this.humanifyService.rename(cleanCode);
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
