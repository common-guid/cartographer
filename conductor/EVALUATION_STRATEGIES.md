# JS Cartographer Evaluation Strategies

This document outlines strategies to evaluate the performance, accuracy, and efficiency of JS Cartographer across its primary functionalities: Renaming (LLM deobfuscation), Filtering (Boilerplate removal), and Call Graph / Data Flow extraction.

## 1. Renaming Evaluation Strategies

The renaming engine is critical for deobfuscating code into a human-readable format. The evaluation must capture whether the resulting code works (syntactically), whether it makes sense (semantically), and how efficiently it is generated.

### 1.1 Syntactic Correctness (Execution Testing)
The fundamental requirement of renaming is that it does not break the code's behavior.
**Strategy:**
- **Execution Harness**: After running `humanify-service` on a suite of target files, execute the resulting scripts using a predefined suite of unit tests.
- **Metric**: The primary metric is the Pass/Fail rate of tests on the generated code compared to tests running on the original minified code.
- **Tooling**: We can use a test runner like Vitest (already available in the repo) to automate post-processing runs.

### 1.2 Deterministic Semantic Accuracy
Comparing Cartographer's proposed variable and function names against a known "ground truth" (the original un-minified code).
**Strategy:**
- **Levenshtein Distance**: Measure the edit distance between the suggested variable name and the ground truth name. A lower average distance indicates higher similarity.
- **Exact / Substring Matches**: Calculate the percentage of variables where the proposed name exactly matches the ground truth, or where the ground truth name is a substring of the proposed name (e.g., `user` vs `userData`).
- **Metric**: Average Levenshtein distance per file; percentage of exact/substring matches.

### 1.3 LLM-as-a-Judge for Semantic Evaluation
Since deterministic string matching doesn't account for synonyms (e.g., `userList` vs `usersArray`), an LLM judge provides a more nuanced score.
**Strategy:**
- **Judge Setup**: Feed the ground truth name, the LLM-proposed name, and the surrounding code context into an evaluator LLM (like GPT-4o).
- **Prompting**: Ask the judge to rate the semantic equivalence on a scale of 1-5 (1 = entirely unrelated, 5 = identical meaning).
- **Metric**: Average semantic score across all renamed variables in the test suite.

### 1.4 Provider / Model Performance Metrics
JS Cartographer supports multiple providers (Gemini, OpenAI, OpenRouter, Local, Heuristic). Evaluating these models requires profiling their real-world usage.
**Strategy:**
- **Metrics to Track**:
  - **Latency**: Measure time taken per file / per AST node during the Map phase.
  - **Token Usage**: Track input and output tokens accurately using the observability tools already present (`startToolSpan`).
  - **Cost Estimation**: Apply provider pricing models to the token counts to output an estimated cost per file or project.
  - **Failure Rates**: Track the number of fallback triggers (where an LLM throws an error or fails to produce valid JSON, returning the unrenamed code).
## 2. Filtering Evaluation Strategies

The Boilerplate/Polyfill Filtering mechanism isolates application logic from framework bootstrap wrappers, significantly reducing token usage.

### 2.1 Token/Size Reduction
**Strategy:**
- **Metric Collection**: Use the `FilterStats` object outputted by `BoilerplateClassifier.classify()`.
- **Metrics**:
  - Compare the byte size and estimated token count of the AST before and after filtering.
  - Calculate the `appCodeRatio` across different bundles (Webpack, Rollup, Vite).
- **Goal**: Validate that Cartographer consistently hits the advertised 60-80% reduction in tokens without degrading functionality.

### 2.2 Precision and Recall (Application Logic Preservation)
The filtering must never accidentally remove application logic, while maximizing the removal of true boilerplate.
**Strategy:**
- **Ground Truth Mapping**: Maintain a test dataset of obfuscated bundles where the exact line ranges of "application logic" vs "boilerplate" are manually labeled or known via source maps.
- **Metric - Precision**: Ensure 100% of the nodes classified as `app` actually contain application logic.
- **Metric - Recall**: Ensure 100% of actual application logic nodes are classified as `app` (i.e., zero application logic is mistakenly classified as `boilerplate` and removed).
- **Execution Testing**: Similar to 1.1, ensure that code passed through the `Reintegrator` still executes identically to the original.

## 3. Call Graph & Data Flow Evaluation Strategies

The accuracy of tracing function calls and mapping data flows is vital for understanding large-scale project architecture.

### 3.1 Ground Truth Graph Generation
**Strategy:**
- Utilize standard, high-precision static analysis tools (like Madge for dependencies, or custom Babel AST traversals) on the original, un-obfuscated source code to generate a "perfect" ground truth call graph and API surface.
- Export this ground truth into the same format used by Cartographer (`call-graph.json`, `module-graph.json`).

### 3.2 Graph Similarity Metrics
**Strategy:**
- **Node Precision & Recall**:
  - **Recall**: What percentage of function nodes identified in the ground truth are present in Cartographer's output?
  - **Precision**: What percentage of nodes generated by Cartographer actually exist in the ground truth (minimizing false positives)?
- **Edge Precision & Recall**:
  - Evaluate the `from` -> `to` edges. Does Cartographer correctly link internal and external function calls?
  - Compare the `edges` array in Cartographer's output to the ground truth edges.
- **Path Resolution Accuracy**: Evaluate the `ReducerService`'s ability to canonicalize paths by measuring how often cross-file calls are correctly stitched together (e.g., `src/a.js:funcA` calls `src/b.js:funcB`).

### 3.3 Taint / Data Flow Tracking (API Sinks)
**Strategy:**
- **Metric**: Measure the accuracy of extracting network boundaries (fetch/axios calls).
- **Evaluation**: Compare the outputted `api-surface.json` and `openapi.json` against known API endpoints within the test projects. Ensure URL patterns and HTTP methods match exactly.
