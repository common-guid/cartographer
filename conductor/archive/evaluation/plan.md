# Plan: Evaluation Harness and Benchmark Strategy

**Commit Convention:** `Scope: evaluation` (e.g., `feat(evaluation): ...`, `test(evaluation): ...`)

## 1. Overview

The goal of this track is to operationalize the Conductor evaluation strategy into an executable benchmark system for JS Cartographer. The system must produce deterministic quality metrics in CI, optional scheduled deep-evaluation metrics, and reproducible artifacts for release decisions.

This plan implements the requirements in:
- `conductor/EVALUATION_STRATEGIES.md`

### Definition of Complete

This track is complete when a single deterministic command can run end-to-end evaluation on a benchmark corpus and generate machine-readable metrics + markdown summary artifacts, and when scheduled/on-demand extensions can run provider + LLM-judge comparisons with explicit labeling of estimated vs provider-native token accounting.

---

## 2. Tasks

### Phase 1: Benchmark Corpus Foundation
- [ ] **Task 1.1:** Create benchmark corpus layout and manifest schema under `benchmarks/`.
  - **Done when:** A documented directory structure exists (project, variant, source map, and ground-truth folders) and a machine-readable manifest format is defined.

- [ ] **Task 1.2:** Add at least one minimal benchmark project with reproducible generation instructions (build/minify + source map retention).
  - **Done when:** Fresh clone can regenerate the benchmark variant from instructions and produce identical artifact structure.

- [ ] **Task 1.3:** Add benchmark fixtures for API extraction edge cases (fetch, axios method calls, templated URLs, aliased client imports).
  - **Done when:** Ground-truth endpoint manifests exist for each fixture and include method + URL pattern expectations.

- [ ] **Task 1.4-test:** Add validation tests for corpus integrity (required files present, manifest parseable, source maps detected where expected).
  - **Done when:** `npm run test` includes corpus integrity tests and they pass.

- [ ] **Checkpoint 1:** Run `npm run test` and verify corpus integrity coverage. Create checkpoint commit.

### Phase 2: Tier 0 Deterministic Evaluation Harness (CI)
- [ ] **Task 2.1:** Create evaluation runner script (e.g., `tests/run-evaluation.js`) that executes deterministic checks against benchmark corpus.
  - **Done when:** Script runs non-interactively and exits non-zero on metric gate violations.

- [ ] **Task 2.2:** Implement rename safety metrics:
  - parse success rate
  - alpha/structural equivalence pass rate
  - unchanged-output (fallback masking) rate
  - **Done when:** Script emits these metrics in machine-readable output.

- [ ] **Task 2.3:** Implement filtering metrics from classifier outputs:
  - appCodeRatio
  - estimated token savings
  - app-node coverage metrics against labels (when available)
  - **Done when:** Script emits filtering metrics per benchmark variant and cohort aggregates.

- [ ] **Task 2.4:** Implement graph/API deterministic metrics:
  - module graph file-level checks
  - call graph node/edge counts
  - API endpoint precision/recall against fixture manifests
  - **Done when:** Script emits graph/API metric blocks and summary gates.

- [ ] **Task 2.5:** Emit reports to a stable artifact path (e.g., `dist-output-eval/`):
  - `metrics.json`
  - `summary.md`
  - `failures.json` (if gate failures exist)
  - **Done when:** Artifacts are always generated for both pass and fail runs.

- [ ] **Task 2.6-test:** Add CI-friendly invocation command in `package.json` (e.g., `test:evaluation`) and verify deterministic completion.
  - **Done when:** `npm run test:evaluation` works on a clean environment (without cloud API keys).

- [ ] **Checkpoint 2:** Run `npm run test:evaluation` and verify artifacts + gate behavior. Create checkpoint commit.

### Phase 3: Tier 1 Scheduled Metrics (Tokenizer + Graph Similarity)
- [ ] **Task 3.1:** Add tokenizer-verified token accounting pass for before/after filtering and renaming payloads.
  - **Done when:** Reports include `true_tokens_before` and `true_tokens_after` with tool/version metadata.

- [ ] **Task 3.2:** Add deterministic naming metrics aligned via benchmark mapping:
  - exact match
  - token-level precision/recall/F1
  - **Done when:** Naming metrics are produced per file and aggregated per cohort.

- [ ] **Task 3.3:** Add graph similarity metrics:
  - node precision/recall/F1
  - edge precision/recall/F1
  - cross-file edge/path-resolution accuracy
  - **Done when:** Similarity report section exists with per-cohort rollups.

- [ ] **Task 3.4-test:** Run scheduled-tier command (e.g., `npm run test:evaluation:tier1`) and verify stable output schema.
  - **Done when:** Tier 1 report artifacts are generated and schema-validated.

- [ ] **Checkpoint 3:** Execute Tier 1 run and verify trend-baseline compatibility. Create checkpoint commit.

### Phase 4: Tier 2 LLM-Judge + Provider Benchmarking
- [ ] **Task 4.1:** Add provider benchmark runner (heuristic + configured LLM providers) for latency/error/fallback metrics.
  - **Done when:** Report includes p50/p95 latency, generation error rate, and fallback rate per provider.

- [ ] **Task 4.2:** Add explicit token accounting labels:
  - estimated token usage
  - provider-native usage (when available)
  - **Done when:** Provider reports clearly distinguish estimated vs native accounting.

- [ ] **Task 4.3:** Add LLM-as-judge pipeline for semantic rename scoring with fixed prompt/model version pinning.
  - **Done when:** Judge metrics include mean, p50, p90, and pairwise provider win-rates.

- [ ] **Task 4.4:** Add judge calibration harness against a human-labeled sample set.
  - **Done when:** Judge reliability metric is reported and documented before score usage in release gating.

- [ ] **Task 4.5-test:** Add on-demand invocation command (e.g., `npm run test:evaluation:tier2`) and validate graceful skip behavior when API keys are absent.
  - **Done when:** Missing credentials produce explicit skip status, not process crash.

- [ ] **Checkpoint 4:** Run Tier 2 on at least one cohort and publish provider comparison report. Create checkpoint commit.

### Phase 5: Visual Verification and Release Gate Integration
- [ ] **Task 5.1:** Add visual verification automation for graph outputs (Explorer or static rendering) with screenshot capture.
  - **Done when:** Each evaluation run can produce screenshots comparing extracted graph views to expected references.

- [ ] **Task 5.2:** Add differential runtime screenshot capture (where UI/runtime fixtures exist) for original vs transformed behavior.
  - **Done when:** Screenshot artifacts are linked from `summary.md` for manual review.

- [ ] **Task 5.3:** Encode initial acceptance gates from strategy doc into runner gate config:
  - alpha equivalence
  - parse success
  - app recall threshold
  - API endpoint recall threshold
  - **Done when:** Gate config is versioned, documented, and enforced by deterministic runner.

- [ ] **Task 5.4-test:** Validate gate-failure ergonomics (clear failure taxonomy and actionable reasons in reports).
  - **Done when:** Failures are easy to triage without inspecting raw logs.

- [ ] **Checkpoint 5:** Full end-to-end dry run across required tiers and visual artifacts. Create checkpoint commit.

---

## 3. Success Criteria
- [ ] **Deterministic CI Gate:** `npm run test:evaluation` runs without external API dependencies and enforces baseline quality gates.
- [ ] **Artifact Completeness:** Every run generates machine-readable metrics (`metrics.json`) and human-readable summary (`summary.md`).
- [ ] **Filtering Insights:** Reports include app-coverage and cost-efficiency metrics (not just token reduction).
- [ ] **Graph/API Insights:** Reports include precision/recall style metrics and endpoint accuracy against manifests.
- [ ] **Provider Transparency:** Tier 2 reports distinguish estimated vs provider-native token accounting and include fallback rates.
- [ ] **Visual Evidence:** Screenshot artifacts are captured and linked for graph and behavioral comparison review.
- [ ] **Release Readiness:** Initial acceptance gates are enforced and regressions are detectable against prior baselines.
