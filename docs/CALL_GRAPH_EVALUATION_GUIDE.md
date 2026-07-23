# Call Graph Evaluation Guide

This guide explains how to use the **Call Graph Evaluation Feature** (Pillar 3 of Cartographer's Evaluation Strategy) to measure the accuracy of function node extraction and call edge detection across bundled and obfuscated JavaScript code.

---

## 1. Overview & Objectives

Cartographer's pipeline parses minified/obfuscated JavaScript bundles and extracts global relationship graphs (`call-graph.json`, `module-graph.json`). 

The **Call Graph Evaluation Harness** validates the accuracy of these extracted graphs by comparing generated output against a known **Ground Truth Manifest** derived from unminified source code (`fixtures/webpack-hello-world/src/`).

### Key Goals
- **Node Completeness:** Ensure 100% of defined functions in the original source code are identified in the extracted call graph.
- **Edge Precision & Recall:** Verify that caller-callee relationships (both internal function calls and cross-file module calls) match the ground truth.
- **Transpiler Resilience:** Ensure evaluation metrics remain robust against Babel/Webpack transpilation noise (e.g. `_interopRequireDefault`, regenerator state machines).

---

## 2. Prerequisites & Architecture

### Prerequisites
- Node.js (v18+ or v22+)
- Cartographer dependencies installed (`npm install`)
- Compiled TypeScript binaries (`npm run build` or running via `evaluate-callgraph.ts`)

### File Structure
- **Evaluation Runner:** `tests/eval/evaluate-callgraph.ts`
- **Ground Truth Manifest:** `tests/eval/ground-truth-callgraph.json`
- **Target Fixture:** `fixtures/webpack-hello-world/`
- **Generated Artifacts:** `dist-output/call-graph.json`

---

## 3. How to Run the Evaluation

To execute the call graph evaluation suite, run the following command from the root directory:

```bash
npm run eval:callgraph
```

### What Happens Behind the Scenes
1. **Automated Pipeline Execution:** If `dist-output/call-graph.json` does not exist, the evaluation runner automatically runs Cartographer's `PipelineOrchestrator` and `ReducerService` on the `webpack-hello-world` fixture.
2. **Node Mapping:** Maps original source function IDs (e.g., `src/app.js:initializeApp`) to generated minified/humanified node IDs in `dist-output/call-graph.json`.
3. **Filtering & Metric Calculation:** Filters out unmapped transpiler helper nodes and computes Precision, Recall, F1 Score, and Cross-File Recall.
4. **Gate Verification:** Compares results against strict threshold criteria and prints a formatted CLI summary.

---

## 4. Interpreting Evaluation Results

When `npm run eval:callgraph` completes, it prints a report similar to the following:

```text
=========================================
 Call Graph Evaluation Metrics
=========================================
 Nodes Expected: 17
 Nodes Mapped:   17 (100.0%)
 Edges Expected: 16
 Edges Found:    13
-----------------------------------------
 Precision:      92.9%
 Recall:         81.3%
 F1 Score:       86.7%
 Cross-File Rec: 92.3%
=========================================

✅ Call Graph Evaluation Success Criteria Met.
```

### Metric Definitions & Target Thresholds

| Metric | Target Threshold | Description | How to Interpret |
|---|---|---|---|
| **Nodes Mapped (Node Recall)** | **100.0%** | Percentage of expected ground-truth function nodes identified in the generated graph. | **100%** means Cartographer successfully extracted every function declaration from the bundle. If < 100%, tree-shaking or extraction regex/AST parser missed functions. |
| **Edges Found (True Positives)** | N/A | Number of ground-truth call relationships accurately detected in the extracted graph. | Higher is better. Reflects valid call connections found between mapped nodes. |
| **Precision** | **≥ 80.0%** | `TP / (TP + FP)` — Ratio of correctly identified call edges to total generated edges between mapped nodes. | High precision (e.g. **92.9%**) indicates Cartographer rarely invents false call connections between application functions. |
| **Recall** | **≥ 80.0%** | `TP / (TP + FN)` — Ratio of ground-truth call edges correctly detected by Cartographer. | High recall (e.g. **81.3%**) means Cartographer captures most of the true function call interactions. |
| **F1 Score** | **≥ 80.0%** | `2 * (Precision * Recall) / (Precision + Recall)` — Harmonic mean of Precision and Recall. | Primary quality benchmark. An F1 ≥ 80% confirms overall call graph extraction reliability. |
| **Cross-File Recall** | **≥ 80.0%** | `CrossFile_TP / CrossFile_Expected` — Recall calculated strictly on call edges that cross module boundaries (e.g. `app.js -> filters.js`). | Measures Cartographer's ability to trace imports and cross-file method calls post-bundling. |

---

## 5. Ground Truth Manifest Format (`ground-truth-callgraph.json`)

If you want to add new test fixtures or extend the ground truth, update `tests/eval/ground-truth-callgraph.json`. The manifest follows this schema:

```json
{
  "fixture": "webpack-hello-world",
  "nodes": [
    { "id": "src/app.js:initializeApp", "file": "src/app.js", "name": "initializeApp" },
    { "id": "src/storage.js:TaskStore:addTask", "file": "src/storage.js", "name": "addTask" }
  ],
  "edges": [
    { "from": "src/app.js:initializeApp", "to": "src/app.js:displayTaskList", "type": "internal" },
    { "from": "src/app.js:initializeApp", "to": "src/storage.js:TaskStore:addTask", "type": "external" }
  ]
}
```

### Key Fields
- `nodes[].id`: Unique identifier formatted as `<file_path>:<function_name>` or `<file_path>:<Class>:<method>`.
- `edges[].type`:
  - `"internal"`: Call within the same file/module.
  - `"external"`: Call across file/module boundaries.

---

## 6. Troubleshooting Evaluation Failures

If evaluation metrics fall below target thresholds:

1. **Node Recall < 100%:**
   - Inspect `dist-output/bundle.js.metadata.json` to verify if the function was classified as boilerplate or dropped during Webpack minification.
2. **Precision < 80%:**
   - Check if AST extractor is generating spurious call edges on variable accesses or property reads rather than true `CallExpression` nodes.
3. **Cross-File Recall < 80%:**
   - Check `src/services/graph/reducer-service.ts` import resolution logic (`enhanced-resolve`). Ensure module export names map cleanly to call site bindings.
