import { Command } from 'commander';
import fs from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';
import { PipelineOrchestrator } from './orchestrator.js';
import { ReducerService } from '../services/graph/reducer-service.js';
import { startServer } from '../explorer/server.js';
import { GraphPresenter } from '../services/callgraph/presenter.js';
import { CallGraphData } from '../services/callgraph/types.js';

dotenv.config();

const program = new Command();

program
  .name('cartographer')
  .description('AI-powered JavaScript deobfuscator, code humanizer, and semantic mapper')
  .version('1.0.0');

program
  .command('run <directory>')
  .description('Run the Map-Reduce deobfuscation pipeline and start the visualizer dashboard')
  .option('-o, --output <dir>', 'Output directory (defaults to $DEFAULT_OUTPUT_DIR or ./dist-output)')
  .option('--no-sanitizer', 'Disable Wakaru structural sanitization')
  .option('--no-heuristic-naming', 'Disable static renaming heuristics')
  .option('-p, --port <number>', 'Port for the local dashboard server (defaults to $PORT or 3000)')
  .action(async (directory, options) => {
    try {
      const inputDir = path.resolve(directory);
      const outputDir = path.resolve(options.output || process.env.DEFAULT_OUTPUT_DIR || './dist-output');
      const port = parseInt(options.port || process.env.PORT || '3000', 10);
      const provider = process.env.LLM_PROVIDER || 'heuristic';

      console.log(`[CLI] Starting JS Cartographer pipeline...`);
      console.log(`[CLI] Input Directory:  ${inputDir}`);
      console.log(`[CLI] Output Directory: ${outputDir}`);
      console.log(`[CLI] Visualizer Port:  ${port}`);
      console.log(`[CLI] LLM Provider:     ${provider}`);

      if (provider !== 'heuristic') {
        if (provider === 'gemini' && !process.env.GEMINI_API_KEY) {
          console.warn(`⚠️  Warning: LLM_PROVIDER is set to 'gemini' but GEMINI_API_KEY is not defined in the environment.`);
        } else if (provider === 'openai' && !process.env.OPENAI_API_KEY) {
          console.warn(`⚠️  Warning: LLM_PROVIDER is set to 'openai' but OPENAI_API_KEY is not defined in the environment.`);
        } else if (provider === 'openrouter' && !process.env.OPENROUTER_API_KEY) {
          console.warn(`⚠️  Warning: LLM_PROVIDER is set to 'openrouter' but OPENROUTER_API_KEY is not defined in the environment.`);
        }
      }

      const allFiles = await getJsFilesRecursive(inputDir);
      if (allFiles.length === 0) {
        console.error(`❌ Error: No JavaScript files found in ${inputDir}`);
        process.exit(1);
      }

      console.log(`[CLI] Found ${allFiles.length} JavaScript file(s) to process.`);

      const useLLMRename = provider !== 'heuristic';
      const orchestrator = new PipelineOrchestrator({
        outputDir,
        useSanitizer: options.sanitizer !== false,
        useHeuristicNaming: options.heuristicNaming !== false,
        useLLMRename
      });

      for (const file of allFiles) {
        const relativePath = path.relative(inputDir, file);
        await orchestrator.processFile(file, relativePath);
      }

      console.log(`\n[CLI] Starting Reduce Phase...`);
      const reducer = new ReducerService();
      await reducer.aggregateAndWrite(outputDir);

      console.log(`\n[CLI] Pipeline execution finished!`);
      startServer(outputDir, port);

    } catch (error: any) {
      console.error(`❌ CLI run error: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command('serve <directory>')
  .description('Start the visualizer dashboard server on an already processed directory')
  .option('-p, --port <number>', 'Port for the local dashboard server (defaults to $PORT or 3000)')
  .action(async (directory, options) => {
    try {
      const outputDir = path.resolve(directory);
      const port = parseInt(options.port || process.env.PORT || '3000', 10);

      console.log(`[CLI] Starting visualizer dashboard...`);
      console.log(`[CLI] Data Directory:   ${outputDir}`);
      console.log(`[CLI] Visualizer Port:  ${port}`);

      startServer(outputDir, port);
    } catch (error: any) {
      console.error(`❌ CLI serve error: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command('graph <directory>')
  .description('Visualize the call graph of a deobfuscated project')
  .option('-e, --entry <id>', 'Specific function ID to trace (e.g., "src/main.js:init")')
  .option('-d, --depth <number>', 'Maximum depth to trace', '5')
  .option('-f, --format <type>', 'Output format: "tree" (default) or "mermaid"', 'tree')
  .action(async (directory, options) => {
    try {
      const outputDir = path.resolve(directory);
      const graphPath = path.join(outputDir, 'call-graph.json');
      
      let rawData: string;
      try {
        rawData = await fs.readFile(graphPath, 'utf-8');
      } catch (e) {
        console.error(`❌ Error: Could not find ${graphPath}.`);
        console.error(`Did you run 'cartographer run ${directory}' first to generate the graph?`);
        process.exit(1);
      }

      const graphData: CallGraphData = JSON.parse(rawData);
      const presenter = new GraphPresenter(graphData);
      const maxDepth = parseInt(options.depth, 10);

      if (options.format === 'mermaid') {
        const output = presenter.toMermaid(options.entry, maxDepth);
        const outPath = path.join(outputDir, 'call-graph.mermaid');
        await fs.writeFile(outPath, output, 'utf-8');
        console.log(`✅ Mermaid graph saved to ${outPath}`);
      } else {
        if (!options.entry) {
          console.error(`❌ Error: '--entry' is required for ASCII tree format.`);
          console.error(`Use '--format mermaid' to export the entire un-filtered graph.`);
          process.exit(1);
        }
        
        console.log(`\nCall Graph for: ${options.entry}\n`);
        const output = presenter.toAsciiTree(options.entry, maxDepth);
        console.log(output);
      }
    } catch (error: any) {
      console.error(`❌ CLI graph error: ${error.message}`);
      process.exit(1);
    }
  });

async function getJsFilesRecursive(dir: string): Promise<string[]> {
  const results: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist-output' || entry.name === 'dist-output-e2e') {
        continue;
      }
      results.push(...(await getJsFilesRecursive(fullPath)));
    } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.jsx'))) {
      results.push(fullPath);
    }
  }

  return results;
}

function getProviderInputCostPerMillionTokens(provider: string): number {
  const normalized = provider.toLowerCase();
  switch (normalized) {
    case 'gemini':
      return 0.075;
    case 'openai':
      return 0.150;
    case 'openrouter':
      return 0.200;
    case 'anthropic':
      return 3.000;
    default:
      return 0.00;
  }
}

function formatSize(chars: number): string {
  if (chars < 1024) return `${chars} B`;
  const kb = chars / 1024;
  return `${kb.toFixed(1)} KB`;
}

program
  .command('plan <input>')
  .description('Run a dry-run analysis to estimate tokens, requests, and processing time/cost')
  .option('-o, --output <dir>', 'Output directory configuration (to inherit default configs)')
  .option('--no-sanitizer', 'Disable Wakaru structural sanitization')
  .option('--no-boilerplate-filter', 'Disable boilerplate/polyfill filtering')
  .action(async (input, options) => {
    try {
      const inputPath = path.resolve(input);
      let stats;
      try {
        stats = await fs.stat(inputPath);
      } catch (e) {
        console.error(`❌ Error: Input path '${input}' does not exist.`);
        process.exit(1);
      }

      let allFiles: string[] = [];
      let inputDir = '';
      if (stats.isDirectory()) {
        inputDir = inputPath;
        allFiles = await getJsFilesRecursive(inputPath);
      } else if (stats.isFile()) {
        inputDir = path.dirname(inputPath);
        if (inputPath.endsWith('.js') || inputPath.endsWith('.jsx')) {
          allFiles = [inputPath];
        }
      }

      if (allFiles.length === 0) {
        console.error(`❌ Error: No JavaScript files found at ${inputPath}`);
        process.exit(1);
      }

      const provider = process.env.LLM_PROVIDER || 'heuristic';
      const useLLMRename = provider !== 'heuristic';
      const useBoilerplateFilter = options.boilerplateFilter !== false && process.env.BOILERPLATE_FILTER_ENABLED !== 'false';

      const orchestrator = new PipelineOrchestrator({
        outputDir: options.output || process.env.DEFAULT_OUTPUT_DIR || './dist-output',
        useSanitizer: options.sanitizer !== false,
        useHeuristicNaming: true,
        useLLMRename,
        useBoilerplateFilter
      });

      console.log(`[CLI] Planning execution for ${allFiles.length} file(s)...`);

      const filePlans = [];
      for (const file of allFiles) {
        const relativePath = path.relative(inputDir, file);
        const plan = await orchestrator.planFile(file, relativePath);
        filePlans.push(plan);
      }

      // Calculations
      let totalOriginalSize = 0;
      let totalSanitizedSize = 0;
      let totalAppCodeSize = 0;
      let totalTokens = 0;
      let totalRequests = 0;

      for (const p of filePlans) {
        totalOriginalSize += p.originalSize;
        totalSanitizedSize += p.sanitizedSize;
        totalAppCodeSize += p.appCodeSize;
        totalTokens += p.estimatedTokens;
        totalRequests += p.requests;
      }

      const avgReduction = totalSanitizedSize > 0
        ? ((1 - totalAppCodeSize / totalSanitizedSize) * 100).toFixed(1)
        : '0.0';

      // Cost estimation
      const costPerMillion = getProviderInputCostPerMillionTokens(provider);
      const estimatedCost = (totalTokens / 1000000) * costPerMillion;

      // Duration estimation
      const localTime = allFiles.length * 0.1; // 100ms per file
      const renameTime = totalRequests * 2.0; // 2s per request
      const rateLimitTime = Math.max(0, totalRequests - 5) * 12.0; // 5 initially free, then 12s refill wait
      const totalDuration = localTime + renameTime + rateLimitTime;

      // Output report
      console.log('\n=========================================================');
      console.log(' JS Cartographer - Dry-Run Execution Plan');
      console.log('=========================================================');
      console.log(`Input:             ${inputPath}`);
      console.log(`LLM Provider:      ${provider} (Model: ${process.env.LLM_MODEL || 'default'})`);
      console.log(`Boilerplate Filter: ${useBoilerplateFilter ? 'Enabled' : 'Disabled'}`);
      console.log('---------------------------------------------------------');
      
      console.log(
        String('File Path').padEnd(30) + ' | ' +
        String('Original').padStart(10) + ' | ' +
        String('App Code').padStart(10) + ' | ' +
        String('Reduction').padStart(10) + ' | ' +
        String('Est. Tokens').padStart(11)
      );
      console.log('-'.repeat(80));

      const displayLimit = 25;
      const filesToDisplay = filePlans.slice(0, displayLimit);
      for (const plan of filesToDisplay) {
        const reductionPercent = plan.sanitizedSize > 0
          ? ((1 - plan.appCodeSize / plan.sanitizedSize) * 100).toFixed(1) + '%'
          : '0.0%';
          
        console.log(
          plan.relativePath.substring(0, 30).padEnd(30) + ' | ' +
          formatSize(plan.originalSize).padStart(10) + ' | ' +
          formatSize(plan.appCodeSize).padStart(10) + ' | ' +
          reductionPercent.padStart(10) + ' | ' +
          plan.estimatedTokens.toLocaleString().padStart(11)
        );
      }

      if (filePlans.length > displayLimit) {
        console.log(`... and ${filePlans.length - displayLimit} more file(s).`);
      }
      console.log('-'.repeat(80));

      console.log(`Total Files Found:         ${allFiles.length}`);
      console.log(`Total Original Size:       ${formatSize(totalOriginalSize)}`);
      console.log(`Total Sanitized Size:      ${formatSize(totalSanitizedSize)}`);
      console.log(`Total Code to LLM:          ${formatSize(totalAppCodeSize)}`);
      console.log(`Average Boilerplate Red.:  ${avgReduction}%`);
      console.log(`Total Estimated Tokens:    ${totalTokens.toLocaleString()}`);
      console.log(`Est. Identifiers to Rename: ${totalRequests.toLocaleString()}`);
      console.log(`Est. LLM API Calls:         ${totalRequests.toLocaleString()}  (1 call/identifier)`);
      console.log('---------------------------------------------------------');
      console.log(`Estimated API Cost (Input): $${estimatedCost.toFixed(5)} (${provider})`);
      console.log(`Estimated Duration:        ~${totalDuration.toFixed(1)}s`);
      console.log('=========================================================\n');

    } catch (error: any) {
      console.error(`❌ CLI plan error: ${error.message}`);
      process.exit(1);
    }
  });

program.parse(process.argv);
