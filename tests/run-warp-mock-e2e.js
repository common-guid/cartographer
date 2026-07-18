import fs from 'node:fs/promises';
import path from 'node:path';
import { PipelineOrchestrator } from '../dist/cli/orchestrator.js';
import { ReducerService } from '../dist/services/graph/reducer-service.js';
import { HumanifyService } from '../dist/services/llm/humanify-service.js';

// Mock HumanifyService.prototype.rename to simulate LLM renaming without making actual API calls
HumanifyService.prototype.rename = async function (code, interaction) {
  console.log(`[Mock Humanify] Intercepted rename call for code of length ${code.length} chars.`);
  // Apply a simple mock renaming of some common obfuscated identifiers to verify reintegration works
  let mockedCode = code;
  // Rename ZY to configMap
  mockedCode = mockedCode.replace(/\bZY\b/g, 'configMap');
  // Rename bA to getHash
  mockedCode = mockedCode.replace(/\bbA\b/g, 'getHash');
  // Rename Qp to resolveHash
  mockedCode = mockedCode.replace(/\bQp\b/g, 'resolveHash');
  return mockedCode;
};

async function main() {
  const outputDir = path.resolve('./test-output-warp-mock');
  console.log(`[E2E Warp Mock] Cleaning output directory: ${outputDir}...`);
  await fs.rm(outputDir, { recursive: true, force: true }).catch(() => {});
  await fs.mkdir(outputDir, { recursive: true });

  const inputDir = path.resolve('./fixtures/warp');
  const file = path.join(inputDir, 'bundle.js');
  const relativePath = 'bundle.js';

  console.log('[E2E Warp Mock] Initializing PipelineOrchestrator...');
  const orchestrator = new PipelineOrchestrator({
    outputDir,
    useSanitizer: true,
    useHeuristicNaming: true,
    useLLMRename: true,
    useBoilerplateFilter: true
  });

  console.log('[E2E Warp Mock] Processing warp bundle...');
  await orchestrator.processFile(file, relativePath);

  console.log('[E2E Warp Mock] Running Reduce Phase...');
  const reducer = new ReducerService();
  await reducer.aggregateAndWrite(outputDir);

  console.log('[E2E Warp Mock] Verifying output files...');
  const expectedFiles = [
    'bundle.js',
    'bundle.js.metadata.json',
    'module-graph.json',
    'call-graph.json',
    'api-surface.json',
    'openapi.json'
  ];

  for (const f of expectedFiles) {
    const filePath = path.join(outputDir, f);
    await fs.access(filePath);
    console.log(`  ✅ Found expected file: ${f}`);
  }

  // Read call-graph.json to verify that Qp/bA/ZY are renamed or processed
  const callGraph = JSON.parse(await fs.readFile(path.join(outputDir, 'call-graph.json'), 'utf-8'));
  const nodes = Object.values(callGraph.nodes || {});
  console.log(`  📊 Total Graph Nodes: ${nodes.length}`);

  const hasConfigMap = nodes.some(n => n.name === 'configMap');
  const hasGetHash = nodes.some(n => n.name === 'getHash');
  const hasResolveHash = nodes.some(n => n.name === 'resolveHash');

  console.log(`  🔍 Renamed configMap node found: ${hasConfigMap}`);
  console.log(`  🔍 Renamed getHash node found: ${hasGetHash}`);
  console.log(`  🔍 Renamed resolveHash node found: ${hasResolveHash}`);

  if (!hasConfigMap && !hasGetHash && !hasResolveHash) {
    throw new Error('Renamed mock node identifiers not found in output call-graph.json');
  }

  console.log('🎉 [E2E Warp Mock] Pipeline executed and verified successfully!');
}

main().catch(error => {
  console.error('[E2E Warp Mock] Failed:', error);
  process.exit(1);
});
