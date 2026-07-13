# End-to-End Multi-Provider Testing System Plan

## 1. Overview
The goal is to build a robust Node.js testing script that orchestrates the JS Cartographer deobfuscation pipeline across multiple LLM providers (`heuristic`, `gemini`, `openrouter`). It will process a benchmark file, save isolated outputs, generate a comprehensive comparison report, and gracefully handle missing credentials.

### Definition of Complete
This plan is considered successfully completed when the single command `npm run test:providers` can be run from the repository root, correctly iterate through all providers against the benchmark file, successfully skip providers with missing API keys, and generate a final `comparison_report.md` artifact containing execution metrics, side-by-side snippets, and unified code diffs—all without throwing unhandled exceptions.

## 2. Directory Structure & Script Placement
* **Test Script:** `tests/run-provider-comparison.js` (Note: This script supersedes and will replace the existing `tests/run-e2e-comparison.js` script).
* **Mock Helper:** `tests/helpers/mock-humanify.js` (for bypassing LLM network calls without contaminating production code).
* **NPM Command:** Add `"test:providers": "node tests/run-provider-comparison.js"` to `package.json` scripts.
* **Output Directories:** Results will be grouped under `dist-output-e2e/`, structured dynamically as `dist-output-e2e/<provider>/`.
* **Unified Report:** A master Markdown report will be generated at `dist-output-e2e/comparison_report.md`.

## 3. Workflow Execution Plan

### Step 3.1: Environment & Pre-checks
1. Load variables from `.env` using `dotenv`.
2. Define the provider matrix: `['heuristic', 'gemini', 'openrouter']`.
3. Define the fixture list: `[{ path: 'fixtures/webpack-hello-world/dist/bundle.js', name: 'bundle.js' }]`. (Structured as an array to easily add more files in the future).
4. **Pre-flight Check:** Verify that all fixture paths exist. Fail fast if any are missing. (Note: `fixtures/` is gitignored, so we must explicitly un-ignore `fixtures/webpack-hello-world/` to ensure CI reproducibility).
5. Clear the `dist-output-e2e` directory for a fresh run.

### Step 3.2: Provider Iteration Loop
For each fixture, the script will loop through the provider matrix, wrapping the execution in a `try/catch` block to gracefully handle pipeline errors:
1. **Graceful Skipping & Mock Bypass:**
   * If `process.env.MOCK_LLM === 'true'`, bypass all API key validation checks.
   * Otherwise, check if `GEMINI_API_KEY` is present before running the `gemini` provider, and check if `OPENROUTER_API_KEY` is present before running `openrouter`.
   * If a required key is missing, log a yellow warning (`"Skipping openrouter: No API key found"`) and `continue` to the next provider.
2. **Environment Override & Restoration:**
   * Save the original `process.env.LLM_PROVIDER`.
   * Temporarily set `process.env.LLM_PROVIDER = currentProvider`.
   * (Ensure `process.env.LLM_PROVIDER` is restored in a `finally` block after the iteration).
3. **Execution & Mock Mode Dispatch:**
   * If `process.env.MOCK_LLM === 'true'` and the provider is an LLM, bypass the orchestrator and use `tests/helpers/mock-humanify.js` to simulate the run (read input, apply `_0x` regex replacement, write output). This avoids contaminating `src/services/llm/humanify-service.ts` with test logic.
   * Otherwise, initialize a new `PipelineOrchestrator` (from `src/cli/orchestrator.ts`).
   * For the `heuristic` provider, configure it with `{ outputDir: 'dist-output-e2e/heuristic', useLLMRename: false, useHeuristicNaming: true }`.
   * For LLM providers, configure it with `{ outputDir: 'dist-output-e2e/<provider>', useLLMRename: true }`.
   * Call `orchestrator.processFile(fixture.path, fixture.name)`.
4. **Data Aggregation:** Read the newly generated output file and save it in memory (along with duration from `PipelineResult` or mock timer, output size, and `process.env.LLM_MODEL`) for the final report phase. If an error occurs, record the error message instead.

### Step 3.3: Diff Generation
To satisfy the requirement for diffs without cluttering the project with massive dependencies, we will use Node's `child_process.spawnSync` to run `git diff --no-index` between the output of `heuristic` (as our baseline) and the LLM providers (`gemini`, `openrouter`). This provides a standard, readable unified diff directly in the markdown report. (Note: Requires `git` on PATH; skip with warning if unavailable).

### Step 3.4: Report Generation (`comparison_report.md`)
After processing, generate a robust Markdown file containing:
1. **Execution Summary Table:**
   | Provider | Status | Execution Time | Output Size | Model |
   |----------|--------|----------------|-------------|-------|
   | heuristic| ✅ Run  | 0.4s           | 2.1 KB      | N/A   |
   | gemini   | ✅ Run  | 8.3s           | 2.3 KB      | Gemini 3.5 Flash (Low) |
   | openrouter| ⚠️ Skip | N/A            | N/A         | N/A   |
   | failing  | ❌ Err | 1.2s           | N/A         | Error msg |
2. **Code Side-by-Side:** Sequential blocks showing snippets of the original code followed by the output of each successful provider. (Truncate snippets to the first 30 lines with a `... (truncated)` marker).
3. **Diffs against Baseline:** Git unified diffs highlighting exactly which names Gemini and OpenRouter chose differently compared to the static Heuristic parser.

### Step 3.5: Success Criteria
To validate the implementation against the requirements, the following checklist must be satisfied:
- [ ] **Single Command Execution:** `npm run test:providers` successfully triggers the entire process from start to finish.
- [ ] **Graceful Skipping:** If an API key is removed from `.env`, the script gracefully skips that provider with a printed warning and finishes testing the remaining providers.
- [ ] **Isolated Outputs:** `dist-output-e2e/<provider>/bundle.js` is successfully written for all executed providers.
- [ ] **Unified Report Generation:** `comparison_report.md` is successfully generated.
- [ ] **Metrics Validation:** The report contains the Execution Summary Table populated with accurate execution times and output sizes.
- [ ] **Diff Generation:** The report contains valid unified text diffs (generated via `git diff --no-index`) highlighting renaming differences.

## 4. Required File Changes
1. **`package.json`**: Add the npm script shortcut.
2. **`tests/run-provider-comparison.js`**: Create the newly designed orchestrator script (approx. ~150 lines of code). Remove `tests/run-e2e-comparison.js`.
3. **`tests/helpers/mock-humanify.js`**: Create mock helper (approx. ~30 lines).
4. **`.gitignore`**: Ensure `dist-output-e2e` is excluded, but `!fixtures/webpack-hello-world/` is included.

## 5. Future Expansion
By building the fixtures as an array mapped out in step 3.1, adding a new test file in the future will be as simple as adding ` { path: 'fixtures/new-file.js', name: 'new-file.js' }` to the array. The script will automatically handle iterating all providers over all fixtures and appending them to the report.
