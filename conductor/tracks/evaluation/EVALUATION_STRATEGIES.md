# JS Cartographer Evaluation Strategy (Conductor)

## 1) Purpose

This document defines the official, phased strategy for evaluating JS Cartographer quality, performance, and cost across:

1. **Renaming quality** (LLM deobfuscation/humanization)
2. **Boilerplate filtering quality** (token/cost reduction vs app-logic coverage)
3. **Call graph + API surface extraction quality** (global architecture understanding)

This plan is designed to be:
- **Reproducible** (dataset-driven)
- **CI-friendly** (tiered test cost)
- **Auditable** (clear metrics, gates, and artifacts)
- **Compatible with current implementation behavior** (including fallback and reintegration semantics)

---

## 2) Ground Rules and Constraints

### 2.1 Key Reality Checks (Current Implementation)

- `HumanifyService` can fall back to original code when provider/binary calls fail.
- Boilerplate filtering does **not** remove nodes from final output; it scopes what is sent to renaming, then reintegrates rename map onto the full AST.
- Current token usage in tracing is primarily estimate-based (character heuristics), not always provider-native token accounting.

### 2.2 Implication for Evaluation

- Any "pass/fail execution" metric must be paired with **rename-coverage metrics**, otherwise silent fallback can inflate quality.
- Filtering quality must be evaluated as **coverage + cost efficiency**, not binary code-survival.
- Provider cost reporting must clearly label **estimated** vs **provider-native** usage.

---

## 3) Evaluation Architecture

## 3.1 Benchmark Dataset (Required First Milestone)

Create and version a benchmark corpus containing:

- Source projects with known behavior and/or tests
- Built/minified bundles from multiple toolchains:
  - Webpack
  - Rollup
  - Vite
- Minifiers:
  - Terser
  - Esbuild
- Source maps retained for alignment tasks

### Dataset requirements

- Includes both small and medium complexity projects
- Includes known API calls (fetch, axios patterns)
- Includes module import/export patterns across files
- Captures fixture metadata and provenance in machine-readable manifest

### Output artifacts (dataset prep)

- `benchmarks/<project>/<variant>/input.js`
- `benchmarks/<project>/<variant>/input.js.map`
- `benchmarks/<project>/<variant>/ground-truth/` (expected metrics and labels)

---

## 3.2 Tiered Evaluation Modes

### Tier 0 (CI, low-cost, deterministic)

- AST/alpha-equivalence safety checks (rename should preserve structure/behavioral intent)
- FilterStats and appCodeRatio regression checks
- Module/API extraction checks in deterministic/heuristic runs

### Tier 1 (Scheduled, moderate-cost)

- Real tokenizer-based token accounting (vs rough estimates)
- Graph precision/recall against benchmark ground truth
- Rename deterministic lexical metrics (exact and token-level)

### Tier 2 (On-demand, paid/LLM-intensive)

- LLM-as-judge semantic rename evaluation
- Multi-provider latency/cost/failure comparison
- N-run variance analysis for stochastic model behavior

---

## 4) Renaming Evaluation

## 4.1 Safety & Behavioral Preservation

### Strategy

1. Parse original + renamed outputs and run structural equivalence checks (identifier-agnostic where applicable).
2. Run behavioral checks:
   - Existing test harness when available
   - Differential runtime harness where feasible (original vs transformed)

### Required metrics

- `rename_parse_success_rate`
- `alpha_equivalence_pass_rate`
- `behavioral_parity_pass_rate`

### Guardrails

- Report **unchanged-output rate** (input == output) to detect fallback masking.

---

## 4.2 Deterministic Naming Metrics

### Strategy

Align generated names to ground truth via source-map-backed mapping on benchmark corpora.

### Required metrics

- `exact_name_match_rate`
- `token_level_precision`
- `token_level_recall`
- `token_level_f1`

> Note: Token-level metrics are preferred over Levenshtein for semantic partial matches.

---

## 4.3 LLM-as-a-Judge Semantic Metrics

### Strategy

For each aligned rename candidate, provide:

- ground-truth name
- Cartographer-proposed name
- bounded local code context

to a judge model with fixed prompt and model version.

### Required metrics

- `judge_semantic_mean`
- `judge_semantic_p50`
- `judge_semantic_p90`
- pairwise win-rate for provider-vs-provider comparisons

### Reliability requirements

- Maintain a human-labeled calibration set
- Track judge/human agreement before trusting aggregate judge scores

---

## 4.4 Provider Performance and Cost

### Strategy

Collect per-provider run metrics using tracing and benchmark harness runs.

### Required metrics

- `latency_ms_p50`, `latency_ms_p95`
- `generation_error_rate`
- `fallback_rate`
- `estimated_input_tokens`, `estimated_output_tokens`
- `estimated_cost_usd`

### Accuracy notes

- When provider-native token usage is unavailable, reports must label numbers as **estimated**.
- Keep provider pricing tables versioned and timestamped.

---

## 5) Filtering Evaluation

## 5.1 Token/Size Reduction

### Strategy

Use classifier output (`FilterStats`, `appCodeRatio`) and tokenizer-based verification passes.

### Required metrics

- `boilerplate_nodes_ratio`
- `app_code_ratio`
- `estimated_tokens_saved`
- `true_tokens_before` / `true_tokens_after` (Tier 1+)

### Success criteria

- Stable and explainable token reduction over benchmark suites
- No regressions in app-code coverage beyond agreed threshold

---

## 5.2 Classification Quality (Coverage + Efficiency)

### Strategy

Evaluate classification against ground-truth labels at statement/node granularity.

### Required metrics

- `app_recall` (critical)
- `app_precision`
- `boilerplate_precision`
- `boilerplate_recall`
- `rename_coverage_on_app_nodes`
- `wasted_tokens_on_boilerplate` (false app classifications)

### Interpretation

- Missing app nodes primarily harms rename quality/readability.
- Misclassifying boilerplate as app primarily harms cost.

---

## 6) Graph & API Extraction Evaluation

## 6.1 Ground Truth Generation

### Strategy

Build ground truth from known-source benchmark projects using:

- deterministic AST traversals for function/module structure
- fixture-level expected API endpoint manifests

Use matching output schema with Cartographer artifacts:

- `module-graph.json`
- `call-graph.json`
- `api-surface.json`
- `openapi.json`

---

## 6.2 Graph Similarity Metrics

### Required metrics

- Node precision/recall/F1
- Edge precision/recall/F1
- Cross-file edge resolution accuracy
- Entry-point detection accuracy

### Alignment requirements

- Do not rely solely on final identifier text for node matching.
- Use stable alignment features (path mapping, source maps, structural signatures).

---

## 6.3 API Surface Metrics

### Required metrics

- Endpoint recall / precision
- HTTP method accuracy
- URL pattern accuracy
- OpenAPI path/method completeness

### Known edge-case buckets

- aliased axios imports
- wrapped HTTP clients
- dynamic URL construction

---

## 7) Phased Conductor Rollout Plan

## Phase 1 — Dataset + Deterministic Baselines

### Objectives

- Create benchmark corpus and manifests
- Implement Tier 0 deterministic evaluation harness
- Deliver API surface baseline metrics

### Done when

- Benchmark corpus checked in with reproducible generation docs
- CI job produces deterministic eval report
- Initial baseline report published

---

## Phase 2 — Renaming + Filtering Quality Metrics

### Objectives

- Add rename coverage + deterministic naming metrics
- Add filtering precision/recall/cost-efficiency metrics
- Add tokenizer-verified token accounting pass

### Done when

- Report includes exact + token-F1 naming metrics
- Report includes app-recall and wasted-token metrics
- Tier 1 scheduled run is stable

---

## Phase 3 — Provider and LLM-Judge Benchmarking

### Objectives

- Integrate LLM-as-judge pipeline
- Run provider comparison with latency/cost/failure dashboards
- Quantify variance via repeated runs

### Done when

- Judge calibration documented
- Provider comparison report available per benchmark cohort
- Confidence intervals/variance included in summary

---

## 8) Verification Protocol (Mandatory per Phase)

For each phase completion:

1. Run deterministic eval suite and collect artifacts.
2. Run required tiered suite (Tier 1/2 as phase requires).
3. Save machine-readable metric outputs (JSON/CSV).
4. Generate markdown summary report.
5. Perform visual review and capture screenshots:
   - Graph visualization screenshots (ground truth vs extracted)
   - Differential behavior screenshots where UI/runtime comparison applies
6. Attach screenshot references and artifact links in phase report.

---

## 9) Reporting Format

Each evaluation report must include:

- Environment metadata (commit SHA, provider/model config, date)
- Dataset cohort and sample count
- Metric tables with p50/p95 and variance where relevant
- Failure taxonomy (parse fail, fallback, unresolved edges, endpoint misses)
- Regression summary vs previous baseline
- Screenshot evidence section

---

## 10) Initial Acceptance Gates

These gates are initial and can be refined after first benchmark cycles:

- `alpha_equivalence_pass_rate = 100%` on deterministic cohort
- `rename_parse_success_rate = 100%` on deterministic cohort
- `app_recall >= 0.98` on labeled benchmark statements
- `api_endpoint_recall >= 0.90` on benchmark endpoint manifest
- Provider runs must publish explicit fallback rates and token estimation method

Any gate failure must block release-track promotion until triaged with a written mitigation plan.
