import { Command } from 'commander';
import fs from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';
import { PipelineOrchestrator } from './orchestrator.js';
import { ReducerService } from '../services/graph/reducer-service.js';
import { startServer } from '../explorer/server.js';
import { LLMProvider } from '../services/llm/rename-service.js';
import { GraphPresenter } from '../services/callgraph/presenter.js';
import { CallGraphData } from '../services/callgraph/types.js';

dotenv.config();

const program = new Command();

class HeuristicLLMProvider implements LLMProvider {
  async rename(name: string, context: string): Promise<string> {
    if (name.startsWith('_0x')) {
      const hexPattern = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const assignmentRegex = new RegExp(`(?:const|let|var|\\b)${hexPattern}\\s*=\\s*([^;\\n]+)`);
      const match = context.match(assignmentRegex);
      if (match) {
        const expr = match[1].trim();
        if (expr.includes('fetch') || expr.includes('axios')) return 'apiResponse';
        if (expr.includes('document.getElementById')) return 'domElement';
        if (expr.includes('require(')) {
          const modMatch = expr.match(/require\(['"]([^'"]+)['"]\)/);
          if (modMatch) return modMatch[1].replace(/[^a-zA-Z]/g, '') + 'Module';
        }
        if (expr.startsWith('new ')) {
          const classMatch = expr.match(/new\s+([a-zA-Z0-9_$]+)/);
          if (classMatch) return classMatch[1].toLowerCase() + 'Instance';
        }
      }
      return 'renamed_' + name.slice(3, 7);
    }
    if (name.length === 1) {
      if (name === 'e') return 'error';
      if (name === 't') return 'text';
      if (name === 'i') return 'index';
      if (name === 'r') return 'result';
      return 'param_' + name;
    }
    return name;
  }
}

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

      const llmProvider = new HeuristicLLMProvider();
      const orchestrator = new PipelineOrchestrator(llmProvider, {
        outputDir,
        useSanitizer: options.sanitizer !== false,
        useHeuristicNaming: options.heuristicNaming !== false
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
      results.push(...(await getJsFilesRecursive(fullPath)));
    } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.jsx'))) {
      results.push(fullPath);
    }
  }

  return results;
}

program.parse(process.argv);
