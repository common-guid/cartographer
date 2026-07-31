# Documentation Drift Audit Report

## Summary of Recent Codebase Changes
Over the past 7 days, the repository introduced and refined several key features:
* **Observability Architecture Update**: Transitioned tracing and observability from Raindrop AI to Langfuse via `TracerService`. Updated the CLI orchestrator (`src/cli/run.ts`) to initialize `tracer` instead of `raindrop`.
* **Multi-Provider E2E Comparisons**: Added testing for Gemini and OpenRouter providers in `tests/run-provider-comparison.js`, including a robust `MOCK_LLM=true` execution bypass.
* **CLI Improvements**: The `plan` command parameter parsing in `src/cli/run.ts` was finalized to accept `<input>` (rather than `<file>`).
* **Evaluation Suite Refinements**: Added Pillar 3 call graph accuracy measurements and unified ground truth evaluation metrics (`evaluate-callgraph.ts`).

## Audit & Execution Summary Table

| File Path | Status | Drift Level | Changes Made |
| :--- | :--- | :--- | :--- |
| `docs/ARCHITECTURE.md` | Updated | Low | Replaced outdated command syntax (`plan <file>` -> `plan <input>`) in the troubleshooting matrix. Added YAML frontmatter with `date_updated: 2026-07-24`. |
| `docs/CALL_GRAPH_EVALUATION_GUIDE.md` | Updated | None | Content aligns with the codebase. Added YAML frontmatter with `date_updated: 2026-07-24`. |
| `docs/e2e_provider_comparison_deep_dive.md` | Updated | None | Content correctly documents the multi-provider mock workflow. Added YAML frontmatter with `date_updated: 2026-07-24`. |
| `docs/e2e_test_providers_walkthrough.md` | Updated | None | Walkthrough accurately references the current E2E CLI parameters and test scripts. Added YAML frontmatter with `date_updated: 2026-07-24`. |
| `docs/langfuse_llms.txt` | No Action Required | None | Text file reference. No drift detected. |
| `docs/raindrop_llms.txt` | No Action Required | None | Text file reference. No drift detected. |

## Change Log & Explanations

### `docs/ARCHITECTURE.md`
* **Section Modified**: Troubleshooting & Error Isolation Matrix
* **Reason**: The CLI plan command argument was originally referenced as `<file>`, but the `run.ts` source explicitly parses `<input>` to accommodate both files and directories.
* **Unified Diff**:
```diff
--- a/docs/ARCHITECTURE.md
+++ b/docs/ARCHITECTURE.md
@@ -1,3 +1,6 @@
+---
+date_updated: 2026-07-24
+---
 # JS Cartographer - Architecture & Design Reference

 This document outlines the internal design, component specifications, data contracts, and error-isolation guides of JS Cartographer. Use this guide to understand how input files are processed and to isolate pipeline failures.
@@ -239,7 +242,7 @@ Use the matrix below to isolate issues.

 | Symptom / Error | Processing Stage | Probable Component Culprit | Debug / Isolation Steps |
 |:---|:---|:---|:---|
-| **`SyntaxError: ...`** during Wakaru or AST parsing | Map Phase: Sanitization / Parse | `WakaruSanitizer` or `BabelASTService` | 1. Run `node dist/cli/run.js plan <file>` with and without `--no-sanitizer` to see if parsing succeeds.<br/>2. Inspect the file to check for ESNext syntax features that require additional Babel plugins. |
+| **`SyntaxError: ...`** during Wakaru or AST parsing | Map Phase: Sanitization / Parse | `WakaruSanitizer` or `BabelASTService` | 1. Run `node dist/cli/run.js plan <input>` with and without `--no-sanitizer` to see if parsing succeeds.<br/>2. Inspect the file to check for ESNext syntax features that require additional Babel plugins. |
 | **`API Rate Limit Exceeded`** or execution hangs | Map Phase: Rename | `HumanifyService` (Token Refiller) | 1. Ensure `BOILERPLATE_FILTER_ENABLED=true` to decrease prompt payload sizes.<br/>2. If using cloud APIs, check rate limits or throttle thread concurrency. |
```
* **Confirmation**: Frontmatter `date_updated` set to `2026-07-24`.

### `docs/CALL_GRAPH_EVALUATION_GUIDE.md`
* **Section Modified**: Top of file
* **Reason**: Standardization across documentation files.
* **Unified Diff**:
```diff
--- a/docs/CALL_GRAPH_EVALUATION_GUIDE.md
+++ b/docs/CALL_GRAPH_EVALUATION_GUIDE.md
@@ -1,3 +1,6 @@
+---
+date_updated: 2026-07-24
+---
 # Call Graph Evaluation Guide
```
* **Confirmation**: Frontmatter `date_updated` set to `2026-07-24`.

### `docs/e2e_provider_comparison_deep_dive.md`
* **Section Modified**: Top of file
* **Reason**: Standardization across documentation files.
* **Unified Diff**:
```diff
--- a/docs/e2e_provider_comparison_deep_dive.md
+++ b/docs/e2e_provider_comparison_deep_dive.md
@@ -1,3 +1,6 @@
+---
+date_updated: 2026-07-24
+---
 # JS Cartographer E2E Multi-Provider Comparison Deep Dive
```
* **Confirmation**: Frontmatter `date_updated` set to `2026-07-24`.

### `docs/e2e_test_providers_walkthrough.md`
* **Section Modified**: Top of file
* **Reason**: Standardization across documentation files.
* **Unified Diff**:
```diff
--- a/docs/e2e_test_providers_walkthrough.md
+++ b/docs/e2e_test_providers_walkthrough.md
@@ -1,3 +1,6 @@
+---
+date_updated: 2026-07-24
+---
 # Walkthrough: Running Multi-Provider E2E Tests in JS Cartographer
```
* **Confirmation**: Frontmatter `date_updated` set to `2026-07-24`.
