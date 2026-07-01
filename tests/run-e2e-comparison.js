import fs from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';
import { PipelineOrchestrator } from '../dist/cli/orchestrator.js';

// Load .env variables
dotenv.config();

const INPUT_FILE = 'fixtures/webpack-hello-world/dist/bundle.js';
const OUTPUT_DIR = 'dist-output-humanify';
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'bundle.js');
const ARTIFACT_PATH = '/home/guid/.gemini/antigravity-cli/brain/870a05d6-fec2-4e46-bd19-0afd480395b7/humanify_comparison.md';

async function main() {
  console.log('🚀 Starting humanify E2E comparison test...');

  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ Error: GEMINI_API_KEY is not defined in the environment (.env file).');
    process.exit(1);
  }

  // Ensure output dir is clean
  await fs.rm(OUTPUT_DIR, { recursive: true, force: true }).catch(() => {});
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  // Instantiate Orchestrator
  const orchestrator = new PipelineOrchestrator({
    outputDir: OUTPUT_DIR,
    useSanitizer: true,
    useHeuristicNaming: false, // We rely strictly on Gemini renaming
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

    // Create a beautiful comparison Markdown report
    const markdown = `# Humanify E2E Output Comparison Report

This report compares the original minified webpack bundle with the output processed by the newly integrated **humanify** Rust binary using Google Gemini.

- **Input File:** [bundle.js (original)](file://${path.resolve(INPUT_FILE)})
- **Output File:** [bundle.js (deobfuscated)](file://${path.resolve(OUTPUT_FILE)})
- **Provider:** \`gemini\` (Model: \`${process.env.LLM_MODEL || 'gemini-3.1-flash-lite'}\`)
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
