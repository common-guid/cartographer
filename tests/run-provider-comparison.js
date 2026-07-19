import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import dotenv from 'dotenv';

// Load .env variables
dotenv.config();

const FIXTURES = [{ path: 'fixtures/webpack-hello-world/dist/bundle.js', name: 'bundle.js' }];
const PROVIDERS = ['heuristic', 'gemini', 'openrouter'];
const OUTPUT_DIR = 'dist-output-e2e';

async function main() {
    console.log('🚀 Starting Multi-Provider E2E comparison test...');

    // Pre-flight check
    for (const fixture of FIXTURES) {
        if (!fsSync.existsSync(fixture.path)) {
            console.error(`❌ Error: Fixture not found at ${fixture.path}`);
            process.exit(1);
        }
    }

    // Clear output dir
    await fs.rm(OUTPUT_DIR, { recursive: true, force: true }).catch(() => {});

    const originalLLMProvider = process.env.LLM_PROVIDER;

    for (const fixture of FIXTURES) {
        console.log(`\n[E2E] Processing fixture: ${fixture.name}`);

        for (const provider of PROVIDERS) {
            fixture.results = fixture.results || {};
            console.log(`\n--- Provider: ${provider} ---`);

            // Check API keys
            if (process.env.MOCK_LLM !== 'true') {
                if (provider === 'gemini' && !process.env.GEMINI_API_KEY) {
                    console.warn(`⚠️ Skipping ${provider}: No API key found`);
                    continue;
                }
                if (provider === 'openrouter' && !process.env.OPENROUTER_API_KEY) {
                    console.warn(`⚠️ Skipping ${provider}: No API key found`);
                    continue;
                }
            }

            try {
                process.env.LLM_PROVIDER = provider;

                const startTime = Date.now();
                const providerOutputDir = path.join(OUTPUT_DIR, provider);
                const outputFile = path.join(providerOutputDir, fixture.name);

                const defaultModels = {
                    gemini: 'gemini-2.5-flash-lite',
                    openrouter: 'google/gemma-3-12b-it',
                    anthropic: 'claude-3-5-haiku-20241022'
                };

                let metrics = {
                    success: false,
                    duration: 0,
                    size: 0,
                    model: process.env.LLM_MODEL || defaultModels[provider] || 'default',
                    error: null
                };

                if (process.env.MOCK_LLM === 'true' && provider !== 'heuristic') {
                    console.log(`[E2E] Running mock process for ${provider}...`);
                    const { mockProcessFile } = await import('./helpers/mock-humanify.js');
                    const result = await mockProcessFile(fixture.path, outputFile, provider);

                    metrics.success = result.success;
                    metrics.size = result.size;
                    metrics.duration = ((Date.now() - startTime) / 1000).toFixed(2);
                } else {
                    console.log(`[E2E] Running Orchestrator for ${provider}...`);

                    // Import inside loop to pick up dynamic env changes
                    const { PipelineOrchestrator } = await import('../dist/cli/orchestrator.js');

                    const orchestrator = new PipelineOrchestrator({
                        outputDir: providerOutputDir,
                        useLLMRename: provider !== 'heuristic',
                        useHeuristicNaming: provider === 'heuristic',
                    });

                    await orchestrator.processFile(fixture.path, fixture.name);

                    const finalCode = await fs.readFile(outputFile, 'utf-8');
                    metrics.success = true;
                    metrics.size = finalCode.length;
                    metrics.duration = ((Date.now() - startTime) / 1000).toFixed(2);
                }

                console.log(`✅ [E2E] Success: ${metrics.duration}s, Size: ${metrics.size}`);

                // Store metrics globally or attached to fixture for report generation later
                if (!fixture.results) fixture.results = {};
                fixture.results[provider] = metrics;

            } catch (err) {
                console.error(`❌ [E2E] Error processing ${provider}:`, err.message);
                if (!fixture.results) fixture.results = {};
                fixture.results[provider] = {
                    success: false,
                    error: err.message
                };
            } finally {
                process.env.LLM_PROVIDER = originalLLMProvider;
            }
        }

        // Generate Diffs against heuristic baseline
        console.log(`\n[E2E] Generating diffs against heuristic baseline...`);
        const baselinePath = path.join(OUTPUT_DIR, 'heuristic', fixture.name);

        for (const provider of PROVIDERS) {
            if (provider === 'heuristic' || !fixture.results[provider] || !fixture.results[provider].success) continue;

            const providerPath = path.join(OUTPUT_DIR, provider, fixture.name);
            const diffResult = spawnSync('git', ['diff', '--no-index', '--unified=3', baselinePath, providerPath], { encoding: 'utf-8' });

            // git diff returns 0 for no differences, 1 for differences. Other codes indicate an error.
            if (diffResult.status === 0 || diffResult.status === 1) {
                fixture.results[provider].diff = diffResult.stdout;
            } else {
                fixture.results[provider].diff = `Diff generation failed: ${diffResult.stderr}`;
            }
        }
    }

    // Generate Final Report
    console.log('\n[E2E] Generating comparison_report.md...');
    let reportMarkdown = '# JS Cartographer Multi-Provider E2E Report\n\n';

    for (const fixture of FIXTURES) {
        reportMarkdown += `## Fixture: ${fixture.name}\n\n`;

        // 1. Execution Summary Table
        reportMarkdown += `### 1. Execution Summary\n\n`;
        reportMarkdown += `| Provider | Status | Execution Time | Output Size | Model |\n`;
        reportMarkdown += `|----------|--------|----------------|-------------|-------|\n`;

        for (const provider of PROVIDERS) {
            const result = fixture.results[provider];
            if (!result) {
                reportMarkdown += `| ${provider} | ⚠️ Skip | N/A | N/A | N/A |\n`;
            } else if (result.success) {
                reportMarkdown += `| ${provider} | ✅ Run | ${result.duration}s | ${result.size} B | ${result.model} |\n`;
            } else {
                reportMarkdown += `| ${provider} | ❌ Err | N/A | N/A | ${result.error} |\n`;
            }
        }
        reportMarkdown += '\n';

        // 2. Code Side-by-Side
        reportMarkdown += `### 2. Output Snippets (First 30 lines)\n\n`;
        for (const provider of PROVIDERS) {
            const result = fixture.results[provider];
            if (result && result.success) {
                const outPath = path.join(OUTPUT_DIR, provider, fixture.name);
                const fullCode = await fs.readFile(outPath, 'utf-8');
                const snippet = fullCode.split('\n').slice(0, 30).join('\n');
                const truncated = fullCode.split('\n').length > 30 ? '\n... (truncated)' : '';

                reportMarkdown += `#### Provider: ${provider}\n`;
                reportMarkdown += `\`\`\`javascript\n${snippet}${truncated}\n\`\`\`\n\n`;
            }
        }

        // 3. Unified Diffs against baseline
        reportMarkdown += `### 3. Diffs (vs heuristic baseline)\n\n`;
        for (const provider of PROVIDERS) {
            const result = fixture.results[provider];
            if (provider !== 'heuristic' && result && result.success && result.diff) {
                reportMarkdown += `#### Diff: heuristic -> ${provider}\n`;
                reportMarkdown += `\`\`\`diff\n${result.diff}\n\`\`\`\n\n`;
            }
        }
    }

    const reportPath = path.join(OUTPUT_DIR, 'comparison_report.md');
    await fs.writeFile(reportPath, reportMarkdown, 'utf-8');
    console.log(`🎉 [E2E] Report successfully generated at ${reportPath}`);
}

main().catch(console.error);
