# Plan: Multi-Provider E2E Testing System

## 1. Overview
The goal is to build a robust Node.js testing script that orchestrates the JS Cartographer deobfuscation pipeline across multiple LLM providers (`heuristic`, `gemini`, `openrouter`). It will process a benchmark file, save isolated outputs, generate a comprehensive comparison report, and gracefully handle missing credentials.

### Definition of Complete
This plan is considered successfully completed when the single command `npm run test:providers` can be run from the repository root, correctly iterate through all providers against the benchmark file, successfully skip providers with missing API keys, and generate a final `comparison_report.md` artifact containing execution metrics, side-by-side snippets, and unified code diffs—all without throwing unhandled exceptions.

---

## 2. Tasks

### Phase 1: Foundation and Scaffolding
- [ ] **Task 1.1:** Add `"test:providers": "node tests/run-provider-comparison.js"` to `package.json` scripts.
- [ ] **Task 1.2:** Add `dist-output-e2e/` to `.gitignore` to prevent test artifacts from being checked in.
- [ ] **Task 1.3:** Create the initial scaffold file `tests/run-provider-comparison.js` that loads `.env` and defines the test fixtures and provider array.

### Phase 2: Execution Pipeline Loop
- [ ] **Task 2.1:** Implement the provider loop that runs `PipelineOrchestrator` on the benchmark files.
- [ ] **Task 2.2:** Add dynamic `process.env` overrides for `LLM_PROVIDER` and target folders (`dist-output-e2e/<provider>`).
- [ ] **Task 2.3:** Add API key validation to gracefully log warnings and skip providers (`gemini`, `openrouter`) if keys are absent.
- [ ] **Task 2.4:** Implement mock offline mode inside `HumanifyService` triggered by `MOCK_LLM=true` that returns mock humanized code via regex replacement on `_0x` patterns.
- [ ] **Task 2.5:** Bypass API key skipping checks if `MOCK_LLM=true` is enabled, allowing offline validation of the entire E2E comparison pipeline.

### Phase 3: Diffing and Reporting
- [ ] **Task 3.1:** Implement timing and size metrics collection.
- [ ] **Task 3.2:** Implement spawning of `git diff --no-index` to build unified diff comparisons between heuristic baseline and LLM outputs.
- [ ] **Task 3.3:** Implement the master Markdown report generation writing to `dist-output-e2e/comparison_report.md`.

---

## 3. Success Criteria
- [ ] **Single Command Execution:** `npm run test:providers` successfully triggers the entire process from start to finish.
- [ ] **Graceful Skipping:** If an API key is removed from `.env`, the script gracefully skips that provider with a printed warning and finishes testing the remaining providers.
- [ ] **Isolated Outputs:** `dist-output-e2e/<provider>/bundle.js` is successfully written for all executed providers.
- [ ] **Unified Report Generation:** `comparison_report.md` is successfully generated.
- [ ] **Metrics Validation:** The report contains the Execution Summary Table populated with accurate execution times and output sizes.
- [ ] **Diff Generation:** The report contains valid unified text diffs (generated via `git diff --no-index`) highlighting renaming differences.
