# Product Guidelines - JS Cartographer

## 1. Code Quality & Standards
* **Strict TypeScript Type Safety:** All code must compile under strict TypeScript configurations. Avoid using `any`; define explicit interfaces and types for all AST nodes and custom API payloads.
* **Separation of Concerns:** Keep CLI parsing, AST traversal/mutations, LLM provider clients, and local explorer API services cleanly separated in modular files under `src/`.
* **Async-First Execution:** Operations involving file filesystem reads/writes and network requests (LLM APIs) must use asynchronous APIs (`node:fs/promises`, `async/await`) to ensure non-blocking performance.

## 2. Deobfuscation & LLM Robustness
* **Syntactic Safety Guarantee:** AST modifications must never generate syntactically invalid JavaScript. Always check that the generated output compiles and parses cleanly back into an AST.
* **Graceful Failure & Fallbacks:** If an LLM request fails due to rate limits, network timeouts, or missing API keys, the runner must catch the error, log a warning, and fall back cleanly (either to heuristics or to the original code) without aborting the entire pipeline.
* **Proactive Rate Limiting:** Strictly enforce client-side token rate limiting to respect API endpoint quotas and keep the provider connection stable.

## 3. CLI Design & Usability
* **Informative & Clean Logging:** Print descriptive console progress bars, execution steps, and total token usage metrics during pipeline processing.
* **Safe Traversal & Resolution:** Ensure target path inputs are resolved safely to prevent directory traversal vulnerabilities (especially inside the webapp dashboard server).
