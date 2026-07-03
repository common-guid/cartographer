import fs from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';
import { PipelineOrchestrator } from '../dist/cli/orchestrator.js';

// Load .env variables
dotenv.config();

// Override provider to agy
process.env.LLM_PROVIDER = 'agy';
delete process.env.GEMINI_API_KEY; // Strip key to ensure we don't accidentally use Gemini API

const INPUT_FILE = 'test-input-project/bundle.js';
const OUTPUT_DIR = 'test-output-project';
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'bundle.js');
const ARTIFACT_PATH = '/home/guid/.gemini/antigravity-cli/brain/c812685c-bb21-49b4-914e-056a06990609/humanify_agy_comparison.md';

async function main() {
  console.log('🚀 Starting Antigravity CLI E2E comparison test...');

  // Ensure output dir is clean
  await fs.rm(OUTPUT_DIR, { recursive: true, force: true }).catch(() => {});
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  // Instantiate Orchestrator
  const orchestrator = new PipelineOrchestrator({
    outputDir: OUTPUT_DIR,
    useSanitizer: true,
    useHeuristicNaming: false, // Rely strictly on agy renaming
    useLLMRename: true,
  });

  try {
    console.log(`[E2E] Processing ${INPUT_FILE}...`);
    const startTime = Date.now();
    await orchestrator.processFile(INPUT_FILE, 'bundle.js');
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ [E2E] File processed successfully in ${duration}s.`);

    // Read original and deobfuscated content
    const originalCode = await fs.readFile(INPUT_FILE, 'utf-8');
    const processedCode = await fs.readFile(OUTPUT_FILE, 'utf-8');

    // Create a comparison Markdown report
    const markdown = `# Antigravity CLI (agy) E2E Output Comparison Report

This report compares the original minified webpack bundle with the output processed by the newly integrated **humanify** Rust binary using the **Antigravity CLI** proxy.

- **Input File:** [bundle.js (original)](file://${path.resolve(INPUT_FILE)})
- **Output File:** [bundle.js (deobfuscated)](file://${path.resolve(OUTPUT_FILE)})
- **Provider:** \`agy\` (Antigravity CLI Proxy)
- **Execution Time:** ${duration}s

---

## 🔍 Code Comparison

### 1. Original Minified Module (First 100 lines/characters snippet)
\`\`\`javascript
${originalCode.slice(0, 3000)}...
\`\`\`

### 2. Post-Processed humanify Output (First 100 lines/characters snippet)
\`\`\`javascript
${processedCode.slice(0, 3000)}...
\`\`\`

---

## 💡 Deobfuscation Analysis
Compare the identifiers (variables, functions, classes) in the post-processed output to verify that they have been renamed to semantic, human-readable names.
`;

    await fs.writeFile(ARTIFACT_PATH, markdown, 'utf-8');
    console.log(`🎉 [E2E] Comparison report successfully written to ${ARTIFACT_PATH}`);
  } catch (error) {
    console.error('❌ [E2E] Pipeline execution failed:', error);
    process.exit(1);
  }
}

main();
