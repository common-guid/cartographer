# JS Cartographer Evaluation Suite Status

This document provides a high-level overview of the current state of the evaluation suite for JS Cartographer. It outlines what we have accomplished and the features yet to be implemented to ensure the reliability and quality of the deobfuscation and reverse-engineering pipeline.

---

## ✅ Accomplished

### 1. Multi-Provider Comparison Testing
We have successfully implemented an End-to-End (E2E) testing suite that allows side-by-side performance comparison of multiple backend naming engines:
* **Current Providers:** The suite supports evaluating the local offline `heuristic` AST renamer alongside AI-powered renaming via the Google Gemini API (`gemini`) and the OpenRouter API (`openrouter`).
* **Metrics tracking:** Execution speed, target file size, model name, and diff generation (vs baseline) are fully integrated.
* **Resiliency:** The test suite correctly identifies and gracefully skips providers lacking appropriate API keys without throwing unhandled exceptions.

### 2. Full Integration Testing (Humanify Pipeline)
We have an automated script (`tests/run-humanify-e2e.js`) that tests the entire map-reduce integration pipeline, covering:
* **CLI Execution:** Successful execution of the pipeline, parsing, processing, and generating correct filesystem artifacts.
* **API Validation:** Starts the Express server and automatically queries local REST endpoints (`/api/files`, `/api/graphs`, `/api/file?path=...`) to verify expected responses and data shapes.
* **Browser Automation:** Launches Puppeteer to programmatically click into the generated React dashboard and ensures the frontend state syncs properly with the backend generated artifacts.

### 3. Visual UI Validation using AI
We have implemented a visual check script (`tests/visual-validation.js`).
* **Workflow:** This script runs Puppeteer, takes a screenshot of the React graph dashboard canvas, and uses the Antigravity CLI proxy (`agy`) to visually confirm whether a network graph is correctly rendering on-screen.

### 4. Mock LLM Testing Mode (CI Friendly)
* To prevent running up API bills or relying on the network during routine tests, we implemented a robust mock proxy layer (`MOCK_LLM=true`).
* The mock bypasses the actual `PipelineOrchestrator` network requests and implements a deterministic regex replacement locally to simulate LLM renaming output, which allows the multi-provider test suite to run rapidly offline.

---

## ⏳ Yet to Accomplish

### 1. Expanding the Fixture Set
* **Current State:** The evaluation tests primarily run against a single isolated target (`fixtures/webpack-hello-world/dist/bundle.js`).
* **To-Do:** We need to expand this array of target files. We require more complex real-world code structures (e.g., heavily obfuscated enterprise code, deeply nested React component bundles, obfuscated WASM loader scripts) to properly stress-test the heuristics and AI providers.

### 2. LLM-as-a-Judge Semantic Quality Scoring
* **Current State:** Our multi-provider report generates git diffs, but measuring the *quality* of the AI's renaming is currently manual.
* **To-Do:** We need to implement an "LLM-as-a-Judge" pipeline. We should build an evaluation prompt that reviews the original code, reviews the deobfuscated output, and automatically scores the output out of 10 based on code semantic correctness and clarity.

### 3. CI/CD Integration
* **Current State:** All our tests (`vitest` suite, E2E scripts) must be invoked locally by the developer.
* **To-Do:** Create GitHub Actions (or equivalent CI pipelines) that automatically run `npm run test` and `MOCK_LLM=true npm run test:providers` on every pull request. This requires ensuring our environment variables and secret management are handled securely.

### 4. Additional Provider Expansion
* **Current State:** We support Gemini and OpenRouter (plus the heuristic baseline).
* **To-Do:** We want to expand support for:
  * Direct OpenAI integration (using `OPENAI_API_KEY`).
  * Direct local execution via GGUF format open-source models using `LOCAL_LLM_PATH` to ensure complete, secure offline semantic renaming capabilities.
