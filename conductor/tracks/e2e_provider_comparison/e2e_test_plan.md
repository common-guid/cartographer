# End-to-End Multi-Provider Testing System Plan

## 1. Overview
The goal is to build a robust Node.js testing script that orchestrates the JS Cartographer deobfuscation pipeline across multiple LLM providers (`heuristic`, `gemini`, `openrouter`). It will process a benchmark file, save isolated outputs, generate a comprehensive comparison report, and gracefully handle missing credentials.

### Definition of Complete
This plan is considered successfully completed when the single command `npm run test:providers` can be run from the repository root, correctly iterate through all providers against the benchmark file, successfully skip providers with missing API keys, and generate a final `comparison_report.md` artifact containing execution metrics, side-by-side snippets, and unified code diffs—all without throwing unhandled exceptions.

## 2. Directory Structure & Script Placement
* **Test Script:** `tests/run-provider-comparison.js`
* **NPM Command:** Add `"test:providers": "node tests/run-provider-comparison.js"` to `package.json` scripts.
* **Output Directories:** Results will be grouped under `dist-output-e2e/`, structured dynamically as `dist-output-e2e/<provider>/`.
* **Unified Report:** A master Markdown report will be generated at `dist-output-e2e/comparison_report.md`.

## 3. Workflow Execution Plan

### Step 3.1: Environment & Pre-checks
1. Load variables from `.env` using `dotenv`.
2. Define the provider matrix: `['heuristic', 'gemini', 'openrouter']`.
3. Define the fixture list: `[{ path: 'fixtures/webpack-hello-world/dist/bundle.js', name: 'bundle.js' }]`. (Structured as an array to easily add more files in the future).
4. Clear the `dist-output-e2e` directory for a fresh run.

### Step 3.2: Provider Iteration Loop
For each fixture, the script will loop through the provider matrix:
1. **Graceful Skipping & Mock Bypass:**
   * If `process.env.MOCK_LLM === 'true'`, bypass all API key validation checks.
   * Otherwise, check if `GEMINI_API_KEY` is present before running the `gemini` provider, and check if `OPENROUTER_API_KEY` is present before running `openrouter`.
   * If a required key is missing, log a yellow warning (`"Skipping openrouter: No API key found"`) and `continue` to the next provider.
2. **Mock Mode Execution (Inside `HumanifyService`):**
   * If `process.env.MOCK_LLM === 'true'`, `HumanifyService` will bypass spawning the `humanify` binary entirely.
   * It will instead return a mock-renamed version of the input JavaScript code by running a regex replacement that maps obfuscated `_0x[a-f0-9]+` identifiers to `mock_var_[a-f0-9]+` variables. This keeps the JS syntactically valid while ensuring the diff output reflects renaming differences.
3. **Environment Override:**
   * Temporarily set `process.env.LLM_PROVIDER = currentProvider` so the underlying `HumanifyService` picks up the correct backend.
4. **Execution & Metrics Collection:**
   * Record `startTime`.
   * Initialize a new `PipelineOrchestrator` targeted at `dist-output-e2e/<provider>`.
   * Run the deobfuscation on the current fixture.
   * Record `endTime` and calculate execution duration.
5. **Data Aggregation:** Read the newly generated output file and save it in memory (along with duration and size) for the final report phase.

### Step 3.3: Diff Generation
To satisfy the requirement for diffs without cluttering the project with massive dependencies, we will use Node's `child_process.spawnSync` to run `git diff --no-index` between the output of `heuristic` (as our baseline) and the LLM providers (`gemini`, `openrouter`). This provides a standard, readable unified diff directly in the markdown report. 

### Step 3.4: Report Generation (`comparison_report.md`)
After processing, generate a robust Markdown file containing:
1. **Execution Summary Table:**
   | Provider | Status | Execution Time | Output Size | Model |
   |----------|--------|----------------|-------------|-------|
   | heuristic| ✅ Run  | 0.4s           | 2.1 KB      | N/A   |
   | gemini   | ✅ Run  | 8.3s           | 2.3 KB      | Gemini 3.5 Flash (Low) |
   | openrouter| ⚠️ Skip | N/A            | N/A         | N/A   |
2. **Code Side-by-Side:** Sequential blocks showing snippets of the original code followed by the output of each successful provider.
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
2. **`tests/run-provider-comparison.js`**: Create the newly designed orchestrator script (approx. ~150 lines of code).
3. **`tests/.gitignore`** (or root `.gitignore`): Ensure `dist-output-e2e` is excluded from git commits.

## 5. Future Expansion
By building the fixtures as an array mapped out in step 3.1, adding a new test file in the future will be as simple as adding ` { path: 'fixtures/new-file.js', name: 'new-file.js' }` to the array. The script will automatically handle iterating all providers over all fixtures and appending them to the report.
