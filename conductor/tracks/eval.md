# Cartographer Evaluation Strategy

## Background

Cartographer's pipeline takes minified/obfuscated JavaScript and produces three main artifacts:

1. **Humanified code** — variable/function names renamed from gibberish (`t`, `n`, `_0xabc`) to semantic names (`add`, `createTask`, `filterByStatus`)
2. **Call graph** — a JSON structure of `{nodes, edges}` showing which functions call which
3. **Module graph + API surface** — dependency relationships between files and detected HTTP endpoints

The goal is an **evaluation framework** that can measure the accuracy of these outputs and maintain a **≥80% success rate** across runs. The key challenge: Cartographer uses LLMs in the pipeline, making output non-deterministic.

## Scope Assessment

> [!IMPORTANT]
> This is a **large topic** that naturally decomposes into **3 independent evaluation pillars**. I recommend we tackle them as separate tracks, starting with the most impactful one. Each pillar can be built and validated independently.

### The Three Pillars

| # | Pillar | What it measures | Difficulty | Impact |
|---|--------|-----------------|-----------|--------|
| 1 | **Structural Correctness** | Does the output code parse & execute identically to the original? | Medium | 🔴 Critical |
| 2 | **Rename Quality** | Are the new names semantically meaningful? | Hard (subjective) | 🟠 High |
| 3 | **Call Graph Accuracy** | Are nodes and edges correct vs. ground truth? | Medium | 🟠 High |

---

## Pillar 1: Structural Correctness (Start Here)

**Question:** *Does the humanified code still do what the original code does?*

This is the most important pillar because if Cartographer introduces syntax errors or behavioral changes, the output is worthless regardless of how good the names are.

### 1.1 Parse-Ability Check (Automated, Zero LLM)
- **What:** Parse the humanified output with Babel in `strict` mode. If it parses, it's syntactically valid.
- **Metric:** `parseable_files / total_files` — target 100%.
- **Implementation:** A simple Vitest test that runs the output through `@babel/parser` and asserts no `SyntaxError`.

### 1.2 Behavioral Equivalence Check (Automated, Zero LLM)
- **What:** The webpack-hello-world fixture has original source files ([app.js](file:///home/guid/projects/cartographer/cartographer/fixtures/webpack-hello-world/src/app.js), [tasks.js](file:///home/guid/projects/cartographer/cartographer/fixtures/webpack-hello-world/src/tasks.js), [filters.js](file:///home/guid/projects/cartographer/cartographer/fixtures/webpack-hello-world/src/filters.js), [storage.js](file:///home/guid/projects/cartographer/cartographer/fixtures/webpack-hello-world/src/storage.js)) and a built bundle. We can:
  1. Run the **original bundle** and capture its `console.log` output
  2. Run the **humanified bundle** and capture its `console.log` output
  3. Assert they match (or match modulo timestamps)
- **Metric:** `matching_outputs / total_tests` — target ≥95%.
- **Implementation:** Node.js subprocess execution with stdout capture and diff.

### 1.3 AST Structure Preservation (Automated, Zero LLM)
- **What:** Compare the AST structure (node types, control flow) between original and humanified code, ignoring identifier names.
- **Metric:** Structural similarity score (tree edit distance or node-type sequence alignment).
- **Why:** Catches cases where the LLM "helpfully" refactors code structure rather than just renaming.

---

## Pillar 2: Rename Quality

**Question:** *Are the new names semantically meaningful and contextually accurate?*

This is the hardest pillar because "good names" is subjective. We attack it from multiple angles.

### 2.1 Ground Truth Fixture Comparison (Automated)
- **What:** The webpack-hello-world fixture is a **controlled experiment** — we have the original source with real names like `createTask`, `filterTasksByStatus`, `TaskStore`, etc. Cartographer's job is to recover names that are semantically close.
- **Ground Truth Manifest:** Create a JSON file mapping each original function/variable name to its obfuscated counterpart in the bundle. After humanification, compare the recovered names against the originals.
- **Metric:** For each identifier, score the recovered name:
  - **Exact match** (e.g., `createTask` → `createTask`): 1.0
  - **Semantic match** (e.g., `createTask` → `makeTask`): 0.75
  - **Partial match** (e.g., `createTask` → `buildItem`): 0.5
  - **Wrong/gibberish** (e.g., `createTask` → `unknownVariable`): 0.0
  - Aggregate: `sum(scores) / count(identifiers)` — target ≥0.60 (80% of names at ≥0.75)
- **Semantic matching:** Use word embedding similarity (e.g., Levenshtein on stemmed words, or an LLM-as-judge call to score similarity).

### 2.2 Rename Coverage Ratio (Automated, Already Exists)
- **What:** The [E2E test](file:///home/guid/projects/cartographer/cartographer/tests/run-humanify-e2e.js#L100-L117) already measures this — it counts how many call graph nodes have names that don't match the obfuscated pattern `^([a-zA-Z]|_0x[a-f0-9]+)$`.
- **Current threshold:** ≥80% renamed (currently hitting 85.7%).
- **Enhancement:** Also track this per-file and per-scope (top-level vs. nested).

### 2.3 Name Quality Heuristics (Automated, Zero LLM)
Static checks that don't need semantic understanding:
- **Not a single letter** (`a`, `x`, `t`) — deducted unless it's a loop variable `i`
- **CamelCase or snake_case** — named following conventions
- **No excessive underscores** (e.g., `__________________________________value` as seen in current output — this is a bug)
- **Doesn't contain `unknown`** (`unknownVariable`, `missingVariable` = the LLM gave up)
- **Metric:** `quality_names / total_renamed_names` — target ≥80%.

### 2.4 LLM-as-Judge (Automated, Uses LLM)
- **What:** Feed the original minified snippet + the humanified snippet to a separate LLM (not the same one that did the renaming) and ask it to score the quality on a 1-5 rubric.
- **Rubric:**
  - 5: Names perfectly describe the function's purpose
  - 4: Names are good, minor improvements possible
  - 3: Names are acceptable but generic
  - 2: Names are misleading or confusing
  - 1: Names are wrong or meaningless
- **Why:** This is the most expensive eval but catches subtle issues that heuristics miss.
- **When:** Run on CI for releases, not on every commit.

---

## Pillar 3: Call Graph Accuracy

**Question:** *Does the extracted call graph match the real call relationships?*

### 3.1 Ground Truth Call Graph from Fixtures (Automated, Zero LLM)
- **What:** The [app.js fixture](file:///home/guid/projects/cartographer/cartographer/fixtures/webpack-hello-world/src/app.js#L1-L13) already documents expected call edges in comments:
  ```
  app.js:initializeApp -> storage.js:TaskStore (constructor + methods)
  app.js:initializeApp -> tasks.js:createTask
  app.js:initializeApp -> filters.js:filterTasksByStatus
  app.js:initializeApp -> filters.js:getTaskStats
  app.js:displayTaskList -> filters.js:searchTasks
  app.js:displayTaskList -> filters.js:getTaskStats
  ```
- **Implementation:** Encode this as a `ground-truth-callgraph.json` manifest. After the pipeline runs, compare the generated `call-graph.json` against it.
- **Metrics:**
  - **Precision:** `correct_edges / total_generated_edges` (are we generating spurious edges?)
  - **Recall:** `correct_edges / total_ground_truth_edges` (are we missing real edges?)
  - **F1 Score:** Harmonic mean of precision and recall — target ≥0.80
- **Fuzzy matching:** Since names may differ post-humanification, match edges by structural position (line number, scope depth) rather than by name.

### 3.2 Node Completeness (Automated, Zero LLM)
- **What:** Check that every function declared in the original source appears as a node in the call graph.
- **Ground truth:** The fixture has ~12 defined functions across 4 files. The call graph should contain nodes for all of them.
- **Metric:** `found_nodes / expected_nodes` — target 100%.

### 3.3 Cross-File Edge Accuracy (Automated, Zero LLM)
- **What:** Specifically validate edges that cross file boundaries (e.g., `app.js → filters.js`). These are the hardest to extract from bundled code and the most valuable for users.
- **Metric:** Separate precision/recall for cross-file edges only.

---

## Recommended Implementation Order

> [!TIP]
> Each chunk below is a self-contained work unit that can be planned, built, and verified independently.

### Chunk 1: Evaluation Infrastructure + Structural Correctness
**Effort:** ~1 session | **Value:** Foundation for everything else

1. Create `tests/eval/` directory structure
2. Create ground truth manifests for the webpack-hello-world fixture:
   - `ground-truth-names.json` — maps obfuscated identifiers to original names
   - `ground-truth-callgraph.json` — expected nodes and edges
3. Implement Pillar 1.1 (parse-ability check)
4. Implement Pillar 1.2 (behavioral equivalence check)
5. Create an `eval:structural` npm script

### Chunk 2: Call Graph Evaluation
**Effort:** ~1 session | **Value:** Directly tests the [extractor-service](file:///home/guid/projects/cartographer/cartographer/src/services/graph/extractor-service.ts)

1. Implement Pillar 3.1 (ground truth comparison with F1 scoring)
2. Implement Pillar 3.2 (node completeness)
3. Implement Pillar 3.3 (cross-file edge accuracy)
4. Create an `eval:callgraph` npm script

### Chunk 3: Rename Quality Evaluation
**Effort:** ~1-2 sessions | **Value:** Directly tests the [humanify-service](file:///home/guid/projects/cartographer/cartographer/src/services/llm/humanify-service.ts)

1. Build the identifier mapping from bundle → original source
2. Implement Pillar 2.1 (ground truth name comparison with semantic scoring)
3. Implement Pillar 2.3 (name quality heuristics)
4. Enhance Pillar 2.2 (rename coverage, per-file breakdown)
5. Create an `eval:rename` npm script

### Chunk 4: LLM-as-Judge + Aggregated Dashboard
**Effort:** ~1 session | **Value:** The "final boss" — holistic quality view

1. Implement Pillar 2.4 (LLM-as-judge scoring)
2. Create an `eval:all` script that runs all evals and produces a unified report
3. Define pass/fail thresholds for CI gating
4. Produce a markdown summary report with all metrics

---

## Verification Plan

### Automated Tests
Each chunk produces runnable eval scripts:
```bash
npm run eval:structural   # Chunk 1
npm run eval:callgraph    # Chunk 2
npm run eval:rename       # Chunk 3
npm run eval:all          # Chunk 4 (aggregates all)
```

### Success Criteria
| Metric | Threshold | Pillar |
|--------|-----------|--------|
| Parse success rate | 100% | Structural |
| Behavioral equivalence | ≥95% | Structural |
| Call graph F1 (overall) | ≥0.80 | Call Graph |
| Call graph node recall | 100% | Call Graph |
| Cross-file edge recall | ≥0.80 | Call Graph |
| Rename coverage | ≥80% | Rename |
| Name quality heuristics | ≥80% | Rename |
| LLM-as-judge avg score | ≥3.5/5 | Rename |

### Manual Verification
- Review the generated ground-truth manifests against the actual fixture source to ensure they're correct
- Spot-check a few evaluation results by hand to validate the scoring logic

---

## Open Questions

> [!IMPORTANT]
> **Fixture diversity:** Right now we only have one fixture (webpack-hello-world). Should we create 2-3 additional fixtures with different characteristics (e.g., a Rollup bundle, a heavily obfuscated sample, a real-world minified library) before building evals? More fixtures = more robust evaluation, but it's more upfront work.

> [!IMPORTANT]
> **LLM non-determinism:** Since the humanify pipeline uses LLMs, results vary between runs. Should we:
> - (a) Run evals N times and report mean ± stddev?
> - (b) Snapshot a single humanified output and evaluate against that snapshot (deterministic but only tests one run)?
> - (c) Both — snapshot for CI, multi-run for periodic quality reports?

> [!NOTE]
> **Which chunk to start with?** I recommend Chunk 1 (Structural Correctness) because it's the most fundamental — if the code doesn't parse or execute correctly, nothing else matters. It also requires zero LLM calls, so it's fast and deterministic to develop and test. But if you feel call graph accuracy is more pressing, Chunk 2 is also self-contained.
