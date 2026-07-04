# Humanify Integration Plan

Based on your request, we will replace our custom, in-house AST traversal and LLM prompt implementation (`LLMRenameService` and `GeminiLLMProvider`) with the official **[humanify](https://github.com/jehna/humanify)** Rust binary. This will guarantee a more robust, heavily-tested renaming engine that handles edge cases and scoping flawlessly via the `oxc` parser.

## 1. Architectural Changes
Currently, our `PipelineOrchestrator` parses the sanitized code into a Babel AST, mutates the AST in-memory using `LLMRenameService`, and then extracts metadata.

**New Pipeline Flow:**
1. **Sanitize (Wakaru):** Read raw file & run Wakaru sanitization. Wakaru handles the structural unminification (loop unrolling, formatting, etc.) -> Output: `cleanCode` (string).
2. **Rename (Humanify):** Pipe `cleanCode` into the `humanify` binary via `stdin`. Humanify takes the structurally cleaned code and intelligently renames the obfuscated identifiers.
   - Command: `humanify gemini -` (with `-m` flag if `LLM_MODEL` is set).
   - Environment: Inherit `GEMINI_API_KEY` from the parent Node process.
   - Output: `renamedCode` (string) captured from `stdout`.
3. **Parse & Extract:** Parse `renamedCode` into a Babel AST to run our call-graph and module-graph extractors.
4. **Save:** Write the `renamedCode` and extracted metadata to disk.

## 2. Binary Management & Execution
We want the integration to remain seamless for the user. We will create a `HumanifyService` class (`src/services/llm/humanify-service.ts`) that manages the execution.

**Execution Strategy:**
* We will use Node's `child_process.spawn` to invoke `humanify`.
* The service will first check if `humanify` is available in the system `$PATH`.
* **Auto-Installer (Optional but recommended):** If `humanify` is not found, we can optionally provide a setup script (`scripts/install-humanify.js`) that automatically `curl`s and extracts the correct binary for the user's OS/architecture (macOS/Linux/Windows) into a local `./bin` directory, falling back to that local binary.

## 3. Configuration Mapping
The `.env` file configuration will map directly to `humanify` CLI arguments:
* `LLM_PROVIDER=gemini` -> invokes `humanify gemini ...`
* `LLM_PROVIDER=openai` -> invokes `humanify openai ...`
* `LLM_PROVIDER=ollama` -> invokes `humanify ollama ...`
* `LLM_MODEL=...` -> adds the `-m <MODEL>` flag.
* API Keys (`GEMINI_API_KEY`, `OPENAI_API_KEY`) will naturally be passed along to the child process environment.

## 4. Code Cleanup
Once the integration is wired up and tested, we will delete the obsolete files to reduce technical debt:
* `src/services/llm/rename-service.ts`
* `src/services/llm/gemini-provider.ts`
* `src/services/llm/identifier-filter.ts`
* Associated unit tests (`gemini-provider.test.ts`, `rename-service.test.ts`, `identifier-filter.test.ts`).
* `HeuristicLLMProvider` will be removed, as local fallback can be delegated to `humanify ollama`.

## 5. Success Criteria & Testing

To ensure a seamless integration, the execution of this plan must satisfy the following phase-specific tests:

### Phase 1: Binary Management
*   [x] **Test 1.1:** `scripts/install-humanify.js` (or similar auto-downloader) correctly detects the host OS/Architecture and downloads the latest `humanify` binary to `node_modules/.bin/humanify`.
*   [x] **Test 1.2:** Calling the downloaded binary with `humanify --version` successfully returns the version string without crashing.

### Phase 2: HumanifyService Integration
*   [x] **Test 2.1:** `HumanifyService.rename(cleanCode)` correctly spawns the `humanify` process and writes the code to `stdin`.
*   [x] **Test 2.2:** `HumanifyService` successfully captures the stdout string and resolves the promise.
*   [x] **Test 2.3:** Environment variables (e.g., `GEMINI_API_KEY`) and CLI flags (e.g., `-m`) are correctly mapped and passed to the child process.

### Phase 3: Pipeline Orchestrator Updates
*   [x] **Test 3.1:** `PipelineOrchestrator` successfully routes the output of Wakaru directly into `HumanifyService`.
*   [x] **Test 3.2:** `PipelineOrchestrator` successfully parses the string output of `HumanifyService` back into a Babel AST without syntax errors.
*   [x] **Test 3.3:** The Metadata Extractor (Call Graph & Module Graph) successfully runs on the renamed AST.

### Phase 4: Code Cleanup
*   [x] **Test 4.1:** All obsolete LLM provider and custom renaming files (`rename-service.ts`, `gemini-provider.ts`, `identifier-filter.ts`) and their respective tests are completely removed.
*   [x] **Test 4.2:** The project successfully compiles (`npm run build`) without any missing module errors.

### Final E2E Output Comparison Test
In addition to the phase checks, we will implement and run a final E2E artifact test against `fixtures/webpack-hello-world/dist/bundle.js`. 
*   [x] **Test E2E Comparison:** Executed pipeline over `fixtures/webpack-hello-world/dist/bundle.js` using `humanify` with Gemini, generating the side-by-side [humanify_comparison.md](file:///home/guid/.gemini/antigravity-cli/brain/870a05d6-fec2-4e46-bd19-0afd480395b7/humanify_comparison.md) report.
