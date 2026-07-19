# JS Cartographer Evaluation Suite Guide

This guide explains how to initiate, use, and interpret the evaluation suite for JS Cartographer. Our evaluation suite consists of several different tests to ensure stability, reliability, and performance across both the backend deobfuscator pipeline and the local React dashboard UI.

---

## 1. Multi-Provider Comparison Test

This test iterates over the available LLM providers (`heuristic`, `gemini`, `openrouter`) to process obfuscated fixtures and generates a comparison report outlining processing times and visual diffs.

### How to Initiate
To run the evaluation across the providers, execute the following command from the repository root:

* **Live Mode:** (Requires appropriate API keys in your `.env` file, e.g., `GEMINI_API_KEY`)
  ```bash
  npm run test:providers
  ```
  *If you omit a specific API key (e.g., `OPENROUTER_API_KEY`), the test will gracefully skip that provider and continue processing the rest.*

* **Mock Mode:** (Runs rapidly offline without querying APIs, suitable for CI/CD)
  ```bash
  MOCK_LLM=true npm run test:providers
  ```

### Understanding the Results
After running the command, navigate to the `dist-output-e2e/` folder. This folder will contain isolated outputs from each provider.

The primary artifact to review is the report at **`dist-output-e2e/comparison_report.md`**.

1. **Execution Summary:** A tabular comparison showing the `Status`, `Execution Time`, and `Output Size` for each backend.
2. **Output Snippets:** The first 30 lines of the output from each provider. Use this to conduct quick visual spot checks.
3. **Unified Diffs:** This is the most crucial part. The report provides unified diffs (via `git diff`) comparing the output of the AI providers directly against the baseline `heuristic` parser.
    * **`-` (Red lines):** The baseline identifier structure.
    * **`+` (Green lines):** How the AI chose to semantically humanize that specific section.

---

## 2. Full Integration E2E Test (Humanify Pipeline)

This evaluation validates that the core map-reduce `PipelineOrchestrator`, the REST API, and the React UI Dashboard are successfully integrated and can communicate correctly.

### How to Initiate
Ensure the code is built (`npm run build`), then execute:

```bash
node tests/run-humanify-e2e.js
```

### Understanding the Results
This test progresses through several phases (Pipeline execution, File generation, Backend API verification, and finally Puppeteer browser automation).

* **CLI Output:** You will see a chronological printout of the test phases passing in your terminal.
* **The Final Report:** A comprehensive test report is generated at `humanify_e2e_run_report.md` in the repository root.
  * The report provides the final pass/fail status of the run.
  * The **Screenshots** section inside the report details where you can find visual artifacts (captured inside the `screenshots/` directory) showing exactly what the UI looked like when the integration test triggered a node click event.

---

## 3. Visual UI Verification Test

This test verifies the visual layout and graph rendering of the local explorer dashboard using browser automation and Antigravity's vision-based AI model.

### How to Initiate
Execute the test from the repository root:

```bash
npm run test:visual
```
*Note: Ensure your local environment is configured appropriately, as this command relies on `agy` to interpret screenshots.*

### Understanding the Results
The test spins up Puppeteer to navigate to the React Dashboard and takes a screenshot (`screenshot.png`). It then passes that screenshot to the `agy` CLI to confirm whether the network graph elements actually rendered.

* **Terminal Output:** The test will output `✅ Visual Validation Passed: Network graph is visible.` if successful, or it will throw an error and exit with code `1` if it fails to detect the graph elements.
* **Reviewing the Image:** You can manually inspect the `screenshot.png` saved in the root folder to see the state of the UI at the moment of evaluation.
