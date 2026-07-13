# Plan: Multi-Provider E2E Testing System

**Commit Convention:** `Scope: e2e` (e.g., `feat(e2e): ...`, `test(e2e): ...`)

## 1. Overview
The goal is to build a robust Node.js testing script (`tests/run-provider-comparison.js`) that orchestrates the JS Cartographer deobfuscation pipeline across multiple LLM providers (`heuristic`, `gemini`, `openrouter`). It will process a benchmark file, save isolated outputs, generate a comprehensive comparison report, and gracefully handle missing credentials. 

This new script replaces the existing `tests/run-e2e-comparison.js`.

### Definition of Complete
This plan is considered successfully completed when the single command `npm run test:providers` can be run from the repository root, correctly iterate through all providers against the benchmark file, successfully skip providers with missing API keys, and generate a final `comparison_report.md` artifact containing execution metrics, side-by-side snippets, and unified code diffs—all without throwing unhandled exceptions.

---

## 2. Tasks

### Phase 1: Foundation and Scaffolding
- [ ] **Task 1.1:** Add `"test:providers": "node tests/run-provider-comparison.js"` to `package.json` scripts, and ensure `fixtures/webpack-hello-world/` is not gitignored.
  - **Done when:** `package.json` includes the script, and `!fixtures/webpack-hello-world/` is added to `.gitignore`.
- [ ] **Task 1.2:** Add `dist-output-e2e/` to `.gitignore` to prevent test artifacts from being checked in.
  - **Done when:** `.gitignore` includes `dist-output-e2e/`.
- [ ] **Task 1.3:** Create the initial scaffold file `tests/run-provider-comparison.js` (~30 LOC) that loads `.env` and defines the test fixtures and provider array. Clean up the old `tests/run-e2e-comparison.js`.
  - **Done when:** `npm run test:providers` executes the script (which might just print a setup message) without crashing, and the old script is deleted.
- [ ] **Checkpoint 1:** Run `npm run test:providers`. Verify scaffold loads. Create checkpoint commit.

### Phase 2: Execution Pipeline Loop & Mock Mode
- [ ] **Task 2.1:** Create `tests/helpers/mock-humanify.js` (~30 LOC) to provide a mock regex replacement for `_0x` identifiers.
  - **Done when:** A mock helper file exists that can take input JS and apply regex replacement safely.
- [ ] **Task 2.2:** Implement the provider loop in `tests/run-provider-comparison.js` that iterates over fixtures and providers. Add dynamic `process.env.LLM_PROVIDER` overrides (with `finally` restoration) and API key validation. (~50 LOC).
  - **Done when:** The script logs the correct sequence of providers, skips providers with missing keys, and restores `LLM_PROVIDER` correctly after each iteration.
- [ ] **Task 2.3:** Integrate `PipelineOrchestrator` execution into the loop. Use the mock helper if `MOCK_LLM=true`, otherwise instantiate `new PipelineOrchestrator` with the correct `useLLMRename` flags (false for heuristic, true for LLM providers) and call `processFile`. Wrap in `try/catch` to handle pipeline errors. (~50 LOC).
  - **Done when:** Running `MOCK_LLM=true npm run test:providers` successfully produces `dist-output-e2e/heuristic/bundle.js`, `dist-output-e2e/gemini/bundle.js`, etc.
- [ ] **Task 2.4-test:** Execute the script with `MOCK_LLM=true` to validate the mock offline mode works without hitting real APIs.
  - **Done when:** The pipeline completes end-to-end for all mocked providers.
- [ ] **Checkpoint 2:** Run `MOCK_LLM=true npm run test:providers`. Verify output files are generated. Create checkpoint commit.

### Phase 3: Diffing and Reporting
- [ ] **Task 3.1:** Implement timing, size, and model metrics collection during the provider loop. Read `process.env.LLM_MODEL`. (~20 LOC).
  - **Done when:** Metrics are collected and stored in memory for each provider run.
- [ ] **Task 3.2:** Implement spawning of `git diff --no-index` to build unified diff comparisons between the heuristic baseline and LLM outputs. (~30 LOC).
  - **Done when:** The script successfully captures standard out from the `git diff` process.
- [ ] **Task 3.3:** Implement the master Markdown report generation writing to `dist-output-e2e/comparison_report.md`. Format the table, code snippets (truncated to 30 lines), and diffs. (~60 LOC).
  - **Done when:** `dist-output-e2e/comparison_report.md` is generated with valid markdown.
- [ ] **Task 3.4-test:** Run the full script with `MOCK_LLM=true` and manually verify the generated report layout.
  - **Done when:** The report contains the Execution Summary Table, side-by-side snippets, and unified text diffs.
- [ ] **Checkpoint 3:** Final verification of the report artifact. Create checkpoint commit.

---

## 3. Success Criteria
- [ ] **Single Command Execution (Tasks 1.1, 1.3):** `npm run test:providers` successfully triggers the entire process from start to finish.
- [ ] **Graceful Skipping (Task 2.2):** If an API key is absent, the script gracefully skips that provider with a printed warning.
- [ ] **Isolated Outputs (Task 2.3):** `dist-output-e2e/<provider>/bundle.js` is successfully written.
- [ ] **Unified Report Generation (Task 3.3):** `comparison_report.md` is successfully generated.
- [ ] **Metrics Validation (Task 3.1, 3.3):** The report contains the Execution Summary Table populated with metrics.
- [ ] **Diff Generation (Task 3.2, 3.3):** The report contains valid unified text diffs highlighting renaming differences.
