# JS Cartographer (v3 Greenfield Restart): Implementation Plan

This implementation plan overrides previous versions to align with our robust ESM-first, Map-Reduce architecture. 

## Table of Contents

### **Phase 1: Foundation & The Unified AST Service**
* **1.1. ESM Build Setup:** Initialize `package.json` with `"type": "module"`. Configure `tsc` to output modern ESM.
* **1.2. Centralized Babel Interop:** Create a unified `src/services/ast/babel-core.ts` wrapper. This single file will safely resolve Babel's default exports to eliminate CJS/ESM interop crashes system-wide.
* **1.3. Dependency Injection:** Install `@wakaru/unminify`, `@babel/core`, `enhanced-resolve`, and `prettier`.
* **🛑 Success Gate:** The success criteria defined in [TESTING.md (Phase 1)](file:///home/guid/projects/cartographer/v1/TESTING.md#phase-1-foundation--the-unified-ast-service) MUST be met, and all unit tests must pass, before this phase is considered complete.

### **Phase 2: The Map-Reduce In-Memory Pipeline**
* **2.1. File Map Orchestrator:** Implement the core loop that processes files one-by-one.
* **2.2. The Wakaru Boundary:** The loop first reads the file to a string, runs Wakaru structural rules, and *then* parses the resulting clean string into a Babel AST using our centralized service.
* **2.3. The Heuristic Filter:** Implement `IdentifierFilter` on the AST to skip standard globals (saving LLM costs).
* **🛑 Success Gate:** The success criteria defined in [TESTING.md (Phase 2)](file:///home/guid/projects/cartographer/v1/TESTING.md#phase-2-the-map-reduce-in-memory-pipeline) MUST be met, and all unit tests must pass, before this phase is considered complete.

### **Phase 3: Cloud-First LLM Renaming**
* **3.1. Provider Integration:** Integrate Google Gemini/OpenAI SDKs.
* **3.2. Scope-based Traversal:** Traverse the AST (outer scopes first) and generate context windows.
* **3.3. Structured JSON Outputs:** Enforce strict JSON responses from the LLM mapping `{ "oldName": "newName" }`, and apply them to the AST.
* **🛑 Success Gate:** The success criteria defined in [TESTING.md (Phase 3)](file:///home/guid/projects/cartographer/v1/TESTING.md#phase-3-cloud-first-llm-renaming) MUST be met, and all unit tests must pass, before this phase is considered complete.

### **Phase 4: Local Graph Extraction (The "Map" Conclusion)**
* **4.1. Local Visitors:** Before formatting, run Visitors on the AST to extract:
  - Imports & Exports (Module Intelligence)
  - Function Definitions & Call Expressions (Call Graph)
  - API Sinks (fetch/axios calls)
* **4.2. State Caching:** Generate the code from the AST. Write the `.js` file and a `.metadata.json` sidecar to disk. This completes the "Map" phase for a single file.
* **🛑 Success Gate:** The success criteria defined in [TESTING.md (Phase 4)](file:///home/guid/projects/cartographer/v1/TESTING.md#phase-4-local-graph-extraction) MUST be met, and all unit tests must pass, before this phase is considered complete.

### **Phase 5: Graph Aggregation (The "Reduce" Phase)**
* **5.1. enhanced-resolve Integration:** Create a robust path resolver that can accurately trace `require(482)` to Webcrack's unbundled artifacts.
* **5.2. Global Stitching:** Read all `.metadata.json` sidecars and construct the final `module-graph.json`, `call-graph.json`, and `api-surface.json`.
* **🛑 Success Gate:** The success criteria defined in [TESTING.md (Phase 5)](file:///home/guid/projects/cartographer/v1/TESTING.md#phase-5-graph-aggregation) MUST be met, and all unit tests must pass, before this phase is considered complete.

### **Phase 6: CLI & Local Dashboard**
* **6.1. CLI Tooling:** Expose `humanify run <dir>` (runs pipeline) and `humanify graph` (ASCII traces).
* **6.2. Express Server:** Serve a local React SPA that reads the generated files to render the visual graph.
* **🛑 Success Gate:** The success criteria defined in [TESTING.md (Phase 6)](file:///home/guid/projects/cartographer/v1/TESTING.md#phase-6-cli--local-dashboard) MUST be met before this phase is considered complete.

# implementation plan

## Humanify + Wakaru Integration: Project Execution Plan

**Objective:** Systematically execute the 6-phase Wakaru integration using a structured, iterative approach that protects the stability of the `humanify` `main` branch.

### 1. Documentation & Repository Setup (Phase 0)

Before writing any code, establish the specifications as the project's source of truth.

* **Action:** Create a new directory in the repository: `docs/architecture/wakaru-integration/`.
* **Action:** Save the generated phase specifications as individual Markdown files:
* `docs/architecture/wakaru-integration/phase-1-foundation.md`
* `docs/architecture/wakaru-integration/phase-2-syntax.md`
* `...`
* `docs/architecture/wakaru-integration/phase-6-cli.md`


* **Action:** Add an `index.md` to this folder summarizing the overarching goal and linking to the phases.

### 2. Branching & Pull Request Strategy

To avoid "big bang" integration nightmares, the project will use a sequential branch-and-merge strategy. Each phase maps to exactly one epic and at least one Pull Request (PR).

* **The Golden Rule:** A phase cannot be started until the previous phase's PR is merged into the `main` (or a dedicated `integration/wakaru` branch if you prefer to keep `main` completely untouched until the end).
* **Naming Convention:**
* Branch: `feature/wakaru-phase-1-foundation`
* PR Title: `feat(wakaru): Phase 1 - Foundation and Pipeline Refactor`



### 3. The Execution Milestones

Group the 6 phases into three distinct, releasable milestones. This allows you to ship value to users incrementally rather than waiting for all 6 phases to finish.

#### Milestone A: "The Optimizer" (Phases 1, 2, & 3)

* **Focus:** Getting Wakaru into the pipeline, fixing syntax, and enabling static renaming.
* **User Value:** Faster processing, lower LLM token costs, and better deobfuscation accuracy.
* **Release Target:** Humanify `v3.0.0` (or next major/minor bump).
* **Checkpoint:** After merging Phase 3, cut a release. Users can immediately benefit from the `--no-sanitizer` and `--no-heuristic-naming` flags.

#### Milestone B: "The Analyzer" (Phases 4 & 5)

* **Focus:** Building the Module Graph and the Semantic Call Graph.
* **User Value:** Internal data generation (No direct CLI output yet, but the `.json` artifacts are generated).
* **Release Target:** Humanify `v3.1.0-alpha`.
* **Checkpoint:** These phases introduce heavy AST traversal. Deploying this as a quiet "alpha" allows you to test performance on large codebases in the wild without breaking the core tool.

#### Milestone C: "The Visualizer" (Phase 6)

* **Focus:** The CLI UX, ASCII Trees, and Mermaid export.
* **User Value:** Users can now visualize their deobfuscated project architecture.
* **Release Target:** Humanify `v3.1.0` (Full Release).
* **Checkpoint:** The `humanify graph` command is officially documented in the README and announced to users.

### 4. Quality Assurance & Testing Strategy

Because this integration alters the Abstract Syntax Tree (AST) before the LLM sees it, rigorous testing is required to ensure we don't accidentally delete code or break logic.

* **Unit Testing (The Sanitizer):**
* Create a suite of "dirty" JavaScript files in a `test/fixtures/wakaru/` directory.
* Write Jest/Vitest tests that assert the `WakaruSanitizer.transform()` output exactly matches a known "clean" snapshot.


* **E2E CLI Testing:**
* Test the feature flags. Ensure `humanify target.js --no-sanitizer` completely bypasses the Wakaru logic.


* **Cost Benchmarking (Crucial for Phase 3):**
* Create a script to run a heavy obfuscated file through Humanify *with* Wakaru and *without* Wakaru.
* Compare the OpenAI/Gemini API token usage to mathematically prove the cost savings. Use this data for your release notes.



### 5. Development Loop (For the Lead Engineer)

For each phase, follow this strict loop:

1. **Read the Spec:** Review the `phase-X.md` file in `docs/architecture/`.
2. **Branch:** Create the feature branch.
3. **Implement:** Write the code exactly as specified, adhering to the variable names and architecture (e.g., `SanitizerConfig`, `CodeTransformer`).
4. **Verify:** Run the specific "Verification" steps listed at the bottom of the phase spec.
5. **Review:** Open a PR. The reviewer's primary job is to cross-reference the code against the `phase-X.md` document.

Would you like to draft a generic Pull Request Template that reviewers can use to verify each phase against its corresponding markdown specification?
## phase 1

### **Phase 1: Foundation & Safe Integration**

**Objective:** Install Wakaru, establish the "Sanitizer Service" architecture with safety toggles, and integrate it into the CLI pipeline without altering current output.

#### **Step 1.1: Dependency Injection & Verification**

We need to install the specific Wakaru packages. Since your Babel version is newer, we will let npm resolve the peers.

**Action:**
Run the following command in your project root:

```bash
npm install @wakaru/unminify @wakaru/unpacker

```

**Verification:**
After installation, run `npm list @babel/core`.

* *Success:* You should see one dominant version (likely `7.25.2`) used by both `humanify` and `@wakaru`.
* *Failure:* If you see multiple distinct versions (e.g., `7.15` and `7.25`), run `npm dedupe` to flatten the tree.

#### **Step 1.2: Define the Service Interface**

We will create the types first, incorporating the **Feature Flag** and **Source Maps** as requested.

**Action:**
Create `src/services/sanitizer/types.ts`.

```typescript
// src/services/sanitizer/types.ts

export interface SanitizerConfig {
  /**
   * Master switch for the sanitizer.
   * If false, the transformer returns the original code immediately.
   * Useful for the CLI flag --no-sanitizer.
   */
  enabled: boolean;
}

export interface TransformationResult {
  code: string;
  /**
   * Preserved for Phase 4/5 (Call Graph).
   * Wakaru can return source maps; we store them here to avoid data loss.
   */
  map?: any; 
}

export interface CodeTransformer {
  name: string;
  transform(code: string, filepath: string): Promise<TransformationResult>;
}

```

#### **Step 1.3: Implement the "Safe" Sanitizer Service**

We will implement the class with a `try/catch` safety net. For Phase 1, the logic inside the try block will be a "pass-through" (returning the code as-is), which we will populate in Phase 2.

**Action:**
Create `src/services/sanitizer/index.ts`.

```typescript
// src/services/sanitizer/index.ts
import { CodeTransformer, SanitizerConfig, TransformationResult } from './types';

// We import Wakaru types now to ensure the build works, 
// but we won't invoke the heavy logic just yet.
import { runTransformationRules } from '@wakaru/unminify';

export class WakaruSanitizer implements CodeTransformer {
  name = 'Wakaru Syntax Sanitizer';
  private config: SanitizerConfig;

  constructor(config: SanitizerConfig = { enabled: true }) {
    this.config = config;
  }

  async transform(code: string, filepath: string): Promise<TransformationResult> {
    // 1. Safe Mode Check
    if (!this.config.enabled) {
      // User explicitly disabled it (e.g. --no-sanitizer)
      return { code };
    }

    console.log(`[Sanitizer] Processing ${filepath}...`);

    try {
      // --- FUTURE PHASE 2 LOGIC GOES HERE ---
      // For now, we simulate success to verify the pipeline.
      // const result = await runTransformationRules(...) 
      
      // Pass-through for Phase 1
      return { code }; 

    } catch (error) {
      // 2. Error Swallow Pattern
      // If Wakaru crashes, we MUST NOT crash the whole tool.
      // We log the error and return the original code so the LLM can still try.
      console.warn(`[Sanitizer] ⚠️ Failed to sanitize ${filepath}. Proceeding with raw code.`);
      console.warn(`[Sanitizer] Error details:`, error);
      
      return { code };
    }
  }
}

```

#### **Step 1.4: Integration into CLI (The "Slot")**

Now we modify your main CLI entry point. Based on your dependencies (`commander`), this is likely `src/cli.ts` (or similar).

**Action:**
Open your main CLI file.

**1. Add the CLI Option:**
Find where you define your `commander` program (e.g., `program.option(...)`).

```typescript
program
  // ... existing options ...
  .option('--no-sanitizer', 'Disable the Wakaru syntax cleanup step');

```

**2. Inject the Service:**
Find the loop where you process files. It likely looks like `await processFile(file, options)`. You need to instantiate the sanitizer *before* the loop, and use it *inside* the loop.

```typescript
// Imports
import { WakaruSanitizer } from './services/sanitizer';

// ... inside the action handler ...
const options = program.opts();

// Initialize Service with the CLI flag
const sanitizer = new WakaruSanitizer({ 
  enabled: options.sanitizer !== false // Commander handles --no-x as false
});

// ... inside your file iteration loop ...
// let code = await fs.readFile(filePath, 'utf-8'); 

// --- NEW SANITIZER STEP ---
const sanitized = await sanitizer.transform(code, filePath);
code = sanitized.code; // Update the variable passed to the LLM
// --------------------------

// ... proceed to LLM generation ...

```

#### **Step 1.5: Validation**

Run the following to confirm Phase 1 is successful:

1. **Build:** `npm run build` (Should pass with no type errors).
2. **Run Default:** `node dist/cli.js test.js` -> Should log `[Sanitizer] Processing test.js...`.
3. **Run Disabled:** `node dist/cli.js test.js --no-sanitizer` -> Should **NOT** log the processing message.

---

## phase 2
> [!quote]- prompt
> ```
> let's  have another look at phase 2. do you have any suggestions to improve the phase 2 implementation spec? Do you have any questions that I could answer in order to make the phase 2 implementation spec more detailed and robust?
> ```

%%
Here is the answer to your question regarding the rules, followed by the complete, detailed **Phase 2 Implementation Specification**.
### **Question: What Wakaru rules will be disabled by cherry-picking?**

By explicitly selecting the "High-Value" rules, we are effectively disabling rules that fall into three categories:

1. **Phase 3 Optimizations (Saved for later):**
* `smart-rename`: (Heuristic renaming of `window`, `document`, etc. We save this for Phase 3 to measure "Optimization %").
* `un-undefined` / `un-infinity` / `un-numeric-literal`: (Static constant replacements. Saved for Phase 3).

2. **Redundant / Riskier Rules:**
* `un-esm`: We disable this because `webcrack` (already in your dependencies) usually handles module unpacking. Running it again here might corrupt imports/exports if the file is already partially processed.
* `un-use-strict`: Removes `"use strict";`. We disable this because it's harmless and sometimes useful context for the LLM.

3. **Low-Impact Stylistic Rules:**
* `un-boolean`: Converts `!0` to `true`. (Minor impact).
* `un-return`: Simplifies complex return statements. (Can sometimes make code *more* verbose without adding clarity).
* `un-while-loop`: Converts `for(;;)` to `while(true)`. (Nice to have, but `un-sequence-expression` handles the messy parts of loops usually).
%%
---

### **Phase 2: The Syntax Restoration Layer (Revised)**

**Objective:** Configure the Sanitizer to "de-transpile" code (fix `async/await`, `classes`, `JSX`) and apply formatting via Prettier, ensuring the LLM receives clean, readable JavaScript.

**Constraint Checklist & Confidence Score:**

1. Option A (Wakaru + Prettier)? **Yes.**
2. Cherry-pick rules? **Yes.**
Confidence Score: 5/5

---

#### **Step 2.1: Dependency Management (Prettier Promotion)**

We need to ensure `prettier` is available as a production dependency, not just a dev tool, since the application will now use it at runtime to format the Wakaru output.

**Action:**
Run the following commands:

```bash
# 1. Move prettier from devDependencies to dependencies
npm uninstall prettier
npm install prettier --save-prod

```

**Verification:**
Check `package.json`. `prettier` should now be under `"dependencies"`.

---

#### **Step 2.2: Define the Rule Set**

We will create a specific list of rules that prioritize **readability** and **structure**.

**Action:**
Create (or edit) `src/services/sanitizer/rules.ts`.

```typescript
// src/services/sanitizer/rules.ts

/**
 * The specific Wakaru transformation rules enabled for Phase 2.
 * These focus on Structural Restoration (fixing compiler artifacts)
 * and Readability (making code scanable).
 */
export const SANITIZER_RULES: string[] = [
    // --- 1. STRUCTURAL RESTORATION (The Heavy Lifting) ---
    'un-async-await',        // Critical: Restores async/await from generator state machines
    'un-jsx',                // Critical: Restores <div /> from React.createElement()
    'un-es6-class',          // Critical: Restores class MyClass {} from prototype assignments
    
    // --- 2. SYNTAX MODERNIZATION ---
    'un-optional-chaining',  // Restores object?.prop
    'un-nullish-coalescing', // Restores value ?? default
    'un-template-literals',  // Restores `string ${var}`
    
    // --- 3. READABILITY CLEANUP ---
    'un-sequence-expression',// Splits "a=1, b=2" into separate lines. Vital for LLMs.
    'un-variable-merging',   // Un-merges unrelated "var a, b, c" declarations.
    'un-curly-braces',       // Adds { } to single-line if-statements.
    'un-flip-comparisons',   // Fixes Yoda conditions (null == a -> a == null)
];

```

---

#### **Step 2.3: Implement Logic & Formatting**

Now we update the `WakaruSanitizer` to run the rules AND run Prettier.

**Action:**
Update `src/services/sanitizer/index.ts`.

```typescript
// src/services/sanitizer/index.ts
import { CodeTransformer, SanitizerConfig, TransformationResult } from './types';
import { runTransformationRules } from '@wakaru/unminify';
import { SANITIZER_RULES } from './rules';
import prettier from 'prettier';

export class WakaruSanitizer implements CodeTransformer {
  name = 'Wakaru Syntax Sanitizer';
  private config: SanitizerConfig;

  constructor(config: SanitizerConfig = { enabled: true }) {
    this.config = config;
  }

  async transform(code: string, filepath: string): Promise<TransformationResult> {
    if (!this.config.enabled) return { code };

    console.log(`[Sanitizer] Cleaning syntax for ${filepath}...`);

    try {
      // 1. Run Wakaru (AST Cleaning)
      const result = await runTransformationRules({
        path: filepath,
        source: code,
      }, SANITIZER_RULES);

      let cleanCode = result.code;

      // 2. Run Prettier (Formatting)
      // We wrap this in a sub-try/catch because if Prettier fails 
      // (due to some weird syntax edge case), we still want the Wakaru result.
      try {
        cleanCode = await prettier.format(cleanCode, {
          parser: 'babel',
          semi: true,
          singleQuote: true,
          trailingComma: 'es5',
        });
      } catch (formatError) {
        console.warn(`[Sanitizer] Prettier failed to format ${filepath}, returning unformatted clean code.`);
      }

      // 3. Return the polished code
      return { 
        code: cleanCode,
        map: result.sourceMap // Preserve for Phase 4/5
      };

    } catch (error) {
      console.warn(`[Sanitizer] ⚠️ Failed to sanitize ${filepath}. Proceeding with raw code.`);
      console.warn(`[Sanitizer] Error details:`, error);
      return { code };
    }
  }
}

```

---

#### **Step 2.4: Update System Prompt**

The LLM no longer needs to be told to fix syntax. We want it to focus purely on **naming**.

**Action:**
Locate your prompt definition file (likely `src/prompts.ts`, `src/ai/systemPrompt.ts`, or defined inline in `src/cli.ts`).

**Find:**

> "Fix syntax errors..." or "Convert code to modern JavaScript..."

**Replace with:**

> "The code you receive has already been structurally de-transpiled and formatted.
> **DO NOT** attempt to restructure logic (loops, classes, async/await) unless strictly necessary.
> Your **PRIMARY** task is to infer the purpose of variables/functions and rename them to meaningful English names."

---

#### **Step 2.5: Verification**

To ensure the cherry-picked rules + Prettier are working:

1. **Create Test File:** `test-phase2.js`
```javascript
// Minified generator (mocking transpiled async) and yoda condition
function *t(){ if(null==x) yield 1; } 

```


2. **Run Tool:**
```bash
node dist/cli.js test-phase2.js

```


3. **Expected Output (Before LLM):**
* `if(null==x)` should become `if (x == null)`.
* The spacing should be perfect (Prettier).
* *(Note: The generator might not fully convert to async/await without the `__generator` helper present, but the Yoda condition and formatting will prove the pipeline is active).*

## phase 3
> [!quote]- prompt
> ```
> review the phase 3 plan. do you have any suggestions that could improve the implementation spec for phase 3? Do you have any questions that I could answer in order to make the phase 3 implementation spec more detailed and robust?
> ```
%%
Here is the detailed implementation plan for **Phase 3**.

In this phase, we activate the "Smart" features of Wakaru. We are shifting from just *cleaning* code to *understanding* it. By identifying standard APIs (like `document`, `window`) and simplifying constants (like `void 0`  `undefined`) before the LLM sees them, we significantly reduce token usage and prevent the AI from "hallucinating" names for well-known variables.
%%
### **Phase 3: Static Analysis & Cost Optimization**

**Objective:** Implement deterministic renaming and constant simplification to reduce LLM costs and increase accuracy.
**Key Features:** Granular configuration (`--no-heuristic-naming`), optimization metrics log, and LLM "Hard Lock" on existing names.

---
#### **Step 3.1: Granular Configuration**

We need to update the configuration interface to allow users to toggle the "Smart Renaming" feature independently of the "Syntax Repair" feature.

**Action:**
Update `src/services/sanitizer/types.ts`.

```typescript
// src/services/sanitizer/types.ts

export interface SanitizerConfig {
  /**
   * Master switch. If false, skips everything.
   */
  enabled: boolean;

  /**
   * Phase 3 Toggle: Enables heuristic renaming (smart-rename) and 
   * constant simplification (un-undefined, un-infinity).
   * Default: true
   */
  useHeuristicNaming: boolean;
}

export interface TransformationResult {
  code: string;
  map?: any; 
}

```

---

#### **Step 3.2: Expand the Rule Set**

We will separate the rules into "Structural" (Phase 2) and "Heuristic" (Phase 3) categories in our constants file.

**Action:**
Update `src/services/sanitizer/rules.ts`.

```typescript
// src/services/sanitizer/rules.ts

// Rules from Phase 2 (Structural Repairs)
export const STRUCTURAL_RULES: string[] = [
    'un-async-await',
    'un-jsx',
    'un-es6-class',
    'un-optional-chaining',
    'un-nullish-coalescing',
    'un-template-literals',
    'un-sequence-expression',
    'un-variable-merging',
    'un-curly-braces',
    'un-flip-comparisons',
];

// Rules for Phase 3 (Static Analysis & Optimization)
export const HEURISTIC_RULES: string[] = [
    'un-undefined',       // void 0 -> undefined
    'un-infinity',        // 1/0 -> Infinity
    'un-numeric-literal', // 0x123 -> 291 (Normalizes numbers)
    'smart-rename'        // Renames variables based on DOM/Node usage
];

```

---

#### **Step 3.3: Implement Logic & Metrics**

We update the service to apply the new rules conditionally and calculate how many characters were saved.

**Action:**
Update `src/services/sanitizer/index.ts`.

```typescript
// src/services/sanitizer/index.ts
import { CodeTransformer, SanitizerConfig, TransformationResult } from './types';
import { runTransformationRules } from '@wakaru/unminify';
import { STRUCTURAL_RULES, HEURISTIC_RULES } from './rules'; // Import both sets
import prettier from 'prettier';

export class WakaruSanitizer implements CodeTransformer {
  name = 'Wakaru Syntax Sanitizer';
  private config: SanitizerConfig;

  constructor(config: SanitizerConfig) {
    // Ensure defaults are set if partial config provided
    this.config = { enabled: true, useHeuristicNaming: true, ...config };
  }

  async transform(code: string, filepath: string): Promise<TransformationResult> {
    if (!this.config.enabled) return { code };

    const originalLength = code.length;
    
    // Build the rule list based on config
    const activeRules = [...STRUCTURAL_RULES];
    if (this.config.useHeuristicNaming) {
      activeRules.push(...HEURISTIC_RULES);
    }

    console.log(`[Sanitizer] Optimizing ${filepath}...`);

    try {
      // 1. Run Wakaru
      const result = await runTransformationRules({
        path: filepath,
        source: code,
      }, activeRules);

      let cleanCode = result.code;

      // 2. Metric Logging (The "Hype")
      if (this.config.useHeuristicNaming) {
        const newLength = cleanCode.length;
        const savings = originalLength - newLength;
        const savingsPercent = ((savings / originalLength) * 100).toFixed(1);
        
        if (savings > 0) {
            console.log(`[Sanitizer] ⚡ Optimized size by ${savingsPercent}% (${savings} chars) via static analysis.`);
        }
      }

      // 3. Run Prettier
      try {
        cleanCode = await prettier.format(cleanCode, {
          parser: 'babel',
          semi: true,
          singleQuote: true,
          trailingComma: 'es5',
        });
      } catch (formatError) {
        // Fallback to unformatted if prettier fails
      }

      return { code: cleanCode, map: result.sourceMap };

    } catch (error) {
      console.warn(`[Sanitizer] ⚠️ Failed to sanitize ${filepath}. Proceeding with raw code.`);
      return { code };
    }
  }
}

```

---

#### **Step 3.4: LLM Grounding (The "Hard Lock")**

We must explicitly forbid the LLM from renaming variables that Wakaru has already solved.

**Action:**
Update your System Prompt file (e.g., `src/prompts.ts`).

**Add this specific instruction block:**

> ### **NAMING RULES (STRICT)**
> 
> 
> 1. **Respect Static Analysis:** The code has been pre-analyzed. If a variable is already named meaningfully (e.g., `document`, `window`, `element`, `jsonResponse`), **YOU MUST NOT RENAME IT**. Treat these names as locked facts.
> 2. **Focus on the Unknown:** Only rename variables that are still obfuscated (e.g., `a`, `x`, `_0x4f2`, `var1`).
> 3. **No Hallucinations:** Do not "guess" a name if you are unsure. If a variable name is locked, use it exactly as is.
> 
> 

---

#### **Step 3.5: CLI Update**

Expose the new granular control to the user.

**Action:**
Update `src/cli.ts` (or your main command definition).

```typescript
// Inside your commander setup
program
  .option('--no-sanitizer', 'Disable all sanitization')
  // NEW OPTION:
  .option('--no-heuristic-naming', 'Disable static renaming (Phase 3 optimization)');

// Inside your action handler
const options = program.opts();

const sanitizer = new WakaruSanitizer({ 
  enabled: options.sanitizer !== false,
  useHeuristicNaming: options.heuristicNaming !== false // Commander handles --no-x
});

```

---

#### **Step 3.6: Verification**

To confirm Phase 3 is working:

1. **Create Test File:** `test-phase3.js`
```javascript
// Uses 'void 0' (undefined) and a clear DOM access
var a = void 0; 
var b = document.getElementById('app'); 

```


2. **Run Tool:**
```bash
node dist/cli.js test-phase3.js

```


3. **Expected Output (Pre-LLM):**
* **Metric Log:** `[Sanitizer] ⚡ Optimized size by X%...`
* **Code Transformation:**
* `var a = void 0;`  `var a = undefined;`
* `var b = ...`  `var element = document.getElementById('app');` (or similar, depending on how smart Wakaru is with this specific snippet).
## phase 4
%%
Here is the detailed implementation plan for **Phase 4**.

In this phase, we move from analyzing single files to understanding the entire project structure. By leveraging your existing `webcrack` integration, we will scan the unpacked directory to build a "Module Map." This map records which file imports which, forming the skeleton for the future Call Graph.
%%
### **Phase 4: Module Intelligence**

**Objective:** Scan the code (post-unpacking) to build a dependency graph that links files together based on `import` and `require` statements.
**Key Artifact:** A `module-graph.json` file representing the project structure.

---

#### **Step 4.1: Define the Graph Data Structure**

We need a standard way to store file relationships.

**Action:**
Create `src/services/graph/types.ts`.

```typescript
// src/services/graph/types.ts

export interface FileNode {
  id: string;          // Relative path (e.g., "src/utils.js")
  imports: string[];   // List of file paths this file imports
  exports: string[];   // List of named exports (e.g., "login", "validate")
}

export interface ModuleGraph {
  files: Record<string, FileNode>;
  entryPoint?: string; // The main file (if detected)
}

```

---

#### **Step 4.2: Implement the Graph Builder**

We need a service that scans a directory, parses every JS file, and extracts its dependencies. Since we already depend on Babel, we will use it here for accurate parsing.

**Action:**
Create `src/services/graph/index.ts`.

```typescript
// src/services/graph/index.ts
import fs from 'node:fs/promises';
import path from 'node:path';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import { ModuleGraph } from './types';

// Helper to recursively find all .js files
async function getFiles(dir: string): Promise<string[]> {
  const dirents = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(dirents.map((dirent) => {
    const res = path.resolve(dir, dirent.name);
    return dirent.isDirectory() ? getFiles(res) : res;
  }));
  return files.flat().filter(f => f.endsWith('.js') || f.endsWith('.ts'));
}

export class GraphBuilder {
  async build(directory: string): Promise<ModuleGraph> {
    console.log(`[Graph] Scanning dependencies in ${directory}...`);
    
    const graph: ModuleGraph = { files: {} };
    const filePaths = await getFiles(directory);

    for (const filePath of filePaths) {
      const code = await fs.readFile(filePath, 'utf-8');
      const relativePath = path.relative(directory, filePath);
      
      const imports: string[] = [];
      const exports: string[] = [];

      try {
        const ast = parse(code, { 
          sourceType: 'module', 
          plugins: ['jsx', 'typescript'] 
        });

        traverse(ast, {
          // 1. Capture Imports (ESM + CommonJS)
          ImportDeclaration(path) {
            imports.push(path.node.source.value);
          },
          CallExpression(path) {
             // Handle require('...')
             if (path.node.callee.type === 'Identifier' && 
                 path.node.callee.name === 'require' &&
                 path.node.arguments[0]?.type === 'StringLiteral') {
                 imports.push(path.node.arguments[0].value);
             }
          },
          // 2. Capture Exports
          ExportNamedDeclaration(path) {
            if (path.node.declaration && path.node.declaration.type === 'FunctionDeclaration') {
                exports.push(path.node.declaration.id?.name || 'anonymous');
            }
            // Add other export types (VariableDeclaration) as needed
          }
        });

        graph.files[relativePath] = { id: relativePath, imports, exports };

      } catch (error) {
        console.warn(`[Graph] Failed to parse ${relativePath} for graph. Skipping.`);
      }
    }

    return graph;
  }
}

```

---

#### **Step 4.3: Integrate into CLI Pipeline**

We need to insert this step *after* `webcrack` finishes unpacking but *before* Humanify starts renaming individual files.

**Action:**
Update `src/cli.ts`.

```typescript
// Imports
import { GraphBuilder } from './services/graph';

// ... inside your main action ...

// 1. EXISTING: Run Webcrack
// const webcrackResult = await webcrack(input); 
// await webcrackResult.save(outputDir);

// 2. NEW: Build Module Graph (Phase 4)
// Only run this if we are working with a directory (either unpacked or provided)
const graphBuilder = new GraphBuilder();
const graph = await graphBuilder.build(outputDir);

// Save the graph to disk for debugging/user reference
const graphPath = path.join(outputDir, 'module-graph.json');
await fs.writeFile(graphPath, JSON.stringify(graph, null, 2));
console.log(`[Graph] Dependency map saved to ${graphPath}`);

// 3. EXISTING: Process Files with Sanitizer & LLM
// Loop through 'outputDir' and process files...
// (Future Phase 5 will use 'graph' here to help context)

```

---

#### **Step 4.4: Handling "Webcrack" Artifacts**

Since `webcrack` unpacks bundles, it might generate files with names like `1.js`, `2.js`.

* **The Problem:** The LLM hates numbers.
* **The Fix:** We rely on the Sanitizer (Phase 2) to clean the *content*, but Phase 4 gives us the *map*.
* **Refinement:** If `webcrack` produced a `bundle.json` or mapping file, we should arguably read that. However, the **GraphBuilder** implemented above is more robust because it reads the *actual files on disk*, which is the source of truth regardless of how they were unpacked.

---

#### **Step 4.5: Verification**

To verify Phase 4:

1. **Create Test Bundle:** A folder `test-project` with two files:
* `main.js`: `import { add } from './utils'; console.log(add(1, 2));`
* `utils.js`: `export function add(a, b) { return a + b; }`


2. **Run Tool:**
```bash
node dist/cli.js test-project --output dist-test

```


3. **Check Output:**
* Look for `dist-test/module-graph.json`.
* **Content Check:**
```json
{
  "files": {
    "main.js": { "imports": ["./utils"], "exports": [] },
    "utils.js": { "imports": [], "exports": ["add"] }
  }
}

```
## phase 5
%%
In this phase, we build the "Nerves" of the system. We will create a `CallGraphBuilder` that runs **after** the LLM has finished renaming the code. It scans the final files to map which function calls which, linking them across files using the module structure we verified in Phase 4.
%%
### **Phase 5: The Call Graph Implementation**

**Objective:** Parse the *final, renamed* code to build a semantic call graph connecting defined functions to their usage sites across files.
**Constraints:** Static exports only; Top-level functions only (no class methods); Persist output to `call-graph.json`.

---

#### **Step 5.1: Define the Data Structure**

We need a structure that represents "Symbols" (Functions) and "Edges" (Calls).

**Action:**
Create `src/services/callgraph/types.ts`.

```typescript
// src/services/callgraph/types.ts

export interface FunctionNode {
  id: string;          // Unique ID (e.g., "src/auth.js:validateUser")
  file: string;        // "src/auth.js"
  name: string;        // "validateUser"
  line: number;        // Line number where defined
}

export interface CallEdge {
  from: string;        // ID of the caller function
  to: string;          // ID of the callee function
  type: 'internal' | 'external'; // internal = same file, external = import
}

export interface CallGraphData {
  nodes: Record<string, FunctionNode>; // Registry of all functions
  edges: CallEdge[];                   // List of all calls
}

```

---

#### **Step 5.2: Implement the Analyzer Logic**

This service traverses the AST to find two things:

1. **Definitions:** `function X() { ... }` (Creates a Node)
2. **Calls:** `X()` (Creates an Edge)

**Action:**
Create `src/services/callgraph/index.ts`.

```typescript
// src/services/callgraph/index.ts
import fs from 'node:fs/promises';
import path from 'node:path';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import { CallGraphData, FunctionNode, CallEdge } from './types';

export class CallGraphBuilder {
  private graph: CallGraphData = { nodes: {}, edges: [] };
  
  // Maps "src/file.js" -> { "localName": "importedSource:exportedName" }
  private importMap: Record<string, Record<string, string>> = {};

  async build(directory: string): Promise<CallGraphData> {
    console.log(`[CallGraph] Analyzing function calls in ${directory}...`);
    
    const files = await this.getFiles(directory);

    // Pass 1: Index all Functions & Imports
    for (const file of files) {
      await this.analyzeFile(file, directory);
    }

    return this.graph;
  }

  private async analyzeFile(filePath: string, rootDir: string) {
    const code = await fs.readFile(filePath, 'utf-8');
    const relativePath = path.relative(rootDir, filePath);
    
    // Track imports for this file: localName -> sourceFile
    const fileImports: Record<string, string> = {}; 

    const ast = parse(code, { sourceType: 'module', plugins: ['typescript'] });

    const self = this;
    
    traverse(ast, {
      // 1. Map Imports: import { login } from './auth'
      ImportDeclaration(path) {
        const source = path.node.source.value; // "./auth"
        
        path.node.specifiers.forEach(spec => {
          if (spec.type === 'ImportSpecifier' && spec.imported.type === 'Identifier') {
             // Resolve path (simplified for CLI)
             const resolvedPath = self.resolvePath(relativePath, source); 
             fileImports[spec.local.name] = `${resolvedPath}:${spec.imported.name}`;
          }
        });
      },

      // 2. Register Function Definitions
      FunctionDeclaration(path) {
        if (path.node.id) {
          const funcName = path.node.id.name;
          const id = `${relativePath}:${funcName}`;
          
          self.graph.nodes[id] = {
            id,
            file: relativePath,
            name: funcName,
            line: path.node.loc?.start.line || 0
          };
        }
      },

      // 3. Record Calls
      CallExpression(path) {
        const callee = path.node.callee;
        // Need to find which function WE are currently inside (Context)
        const parentFunc = path.getFunctionParent();
        const callerName = parentFunc?.node?.id?.name || 'root'; // 'root' = top level
        const callerId = `${relativePath}:${callerName}`;

        if (callee.type === 'Identifier') {
          const calledName = callee.name;
          
          // Case A: Is it an imported function?
          if (fileImports[calledName]) {
             // It's external! Link to the resolved ID.
             self.graph.edges.push({
               from: callerId,
               to: fileImports[calledName], 
               type: 'external'
             });
          } 
          // Case B: Is it local?
          else {
             self.graph.edges.push({
               from: callerId,
               to: `${relativePath}:${calledName}`,
               type: 'internal'
             });
          }
        }
      }
    });
  }

  // Helper: naive path resolver ( ./auth -> src/auth.js )
  // In a real app, this needs to handle index.js, extensions, etc.
  private resolvePath(currentFile: string, importPath: string): string {
    const dir = path.dirname(currentFile);
    // Simple join. Real implementation should check if .js exists.
    let resolved = path.join(dir, importPath); 
    if (!resolved.endsWith('.js')) resolved += '.js';
    return resolved;
  }
  
  private async getFiles(dir: string): Promise<string[]> {
     // Re-use logic from Phase 4 or import a shared utility
     // ... implementation ...
     return []; 
  }
}

```

---

#### **Step 5.3: Integrate into Pipeline**

We run this as the **final step** in the CLI.

**Action:**
Update `src/cli.ts`.

```typescript
// Imports
import { CallGraphBuilder } from './services/callgraph';

// ... after the LLM Loop finishes ...

// 4. NEW: Build Semantic Call Graph (Phase 5)
console.log('[Phase 5] Building Call Graph...');
const callGraphBuilder = new CallGraphBuilder();
const callGraph = await callGraphBuilder.build(outputDir);

// Save Artifact
const callGraphPath = path.join(outputDir, 'call-graph.json');
await fs.writeFile(callGraphPath, JSON.stringify(callGraph, null, 2));
console.log(`[CallGraph] Graph data saved to ${callGraphPath}`);

```

---

#### **Step 5.4: Verification**

To verify Phase 5:

1. **Test Project:**
* `main.js`: `import { fnB } from './lib.js'; function fnA() { fnB(); } fnA();`
* `lib.js`: `export function fnB() { console.log('hi'); }`


2. **Run Tool:**
```bash
node dist/cli.js test-project

```


3. **Check Artifact:** `dist/call-graph.json`.
4. **Expectation:**
* **Nodes:** `main.js:fnA`, `lib.js:fnB`.
* **Edge:** `from: "main.js:fnA"`, `to: "lib.js:fnB"`.
## phase 6
%%
Here is the detailed implementation plan for **Phase 6**.

In this final phase, we expose the Call Graph data to the user through a dedicated CLI sub-command. We will implement a custom, zero-dependency ASCII tree generator for immediate terminal feedback, and a MermaidJS exporter for documentation purposes.
%%
### **Phase 6: CLI Experience & Visualization**
**Objective:** Create the `humanify graph` sub-command to allow users to query, filter, and visualize the semantic call graph.
**Key Features:** Entry-point filtering, depth limiting, zero-dependency ASCII tree output, and Mermaid export.

---

#### **Step 6.1: Create the Graph Presenter Service**

We need a service that reads the `call-graph.json` generated in Phase 5 and converts it into either an ASCII tree or a Mermaid diagram.

**Action:**
Create `{{PATH_TO_SRC}}/services/callgraph/presenter.ts`.

```typescript
// {{PATH_TO_SRC}}/services/callgraph/presenter.ts
import { CallGraphData } from './types';

export class GraphPresenter {
  constructor(private data: CallGraphData) {}

  /**
   * Generates a Mermaid.js flowchart string.
   */
  toMermaid(entryId?: string, maxDepth: number = Infinity): string {
    let output = 'graph TD\n';
    const visited = new Set<string>();
    const edgesToRender = new Set<string>();

    // Helper to traverse and collect edges
    const traverse = (currentId: string, currentDepth: number) => {
      if (currentDepth >= maxDepth || visited.has(currentId)) return;
      visited.add(currentId);

      const outgoing = this.data.edges.filter(e => e.from === currentId);
      for (const edge of outgoing) {
        const edgeKey = `${edge.from}-->${edge.to}`;
        if (!edgesToRender.has(edgeKey)) {
          // Format: A["file.js:fnA"] --> B["other.js:fnB"]
          const fromNode = this.data.nodes[edge.from];
          const toNode = this.data.nodes[edge.to];
          
          if (fromNode && toNode) {
            output += `    id_${edge.from.replace(/[^a-zA-Z0-9]/g, '_')}["${fromNode.id}"] --> id_${edge.to.replace(/[^a-zA-Z0-9]/g, '_')}["${toNode.id}"]\n`;
            edgesToRender.add(edgeKey);
          }
        }
        traverse(edge.to, currentDepth + 1);
      }
    };

    if (entryId) {
      if (!this.data.nodes[entryId]) throw new Error(`Entry point ${entryId} not found.`);
      traverse(entryId, 0);
    } else {
      // If no entry, render everything (can be massive)
      Object.keys(this.data.nodes).forEach(id => traverse(id, 0));
    }

    return output;
  }

  /**
   * Generates a terminal-friendly ASCII tree.
   */
  toAsciiTree(entryId: string, maxDepth: number = Infinity): string {
    if (!this.data.nodes[entryId]) throw new Error(`Entry point ${entryId} not found.`);
    
    let output = '';
    const visited = new Set<string>();

    const buildTree = (currentId: string, currentDepth: number, prefix: string, isLast: boolean) => {
      if (currentDepth > maxDepth) return;

      const node = this.data.nodes[currentId];
      if (!node) return;

      // Cycle detection
      if (visited.has(currentId)) {
        output += `${prefix}${isLast ? '└── ' : '├── '}[CYCLE] ${currentId}\n`;
        return;
      }
      visited.add(currentId);

      // Print current node
      const connector = currentDepth === 0 ? '' : (isLast ? '└── ' : '├── ');
      output += `${prefix}${connector}${currentId}\n`;

      // Get children (outgoing calls)
      const outgoing = this.data.edges.filter(e => e.from === currentId);
      const childPrefix = currentDepth === 0 ? '' : prefix + (isLast ? '    ' : '│   ');

      for (let i = 0; i < outgoing.length; i++) {
        buildTree(outgoing[i].to, currentDepth + 1, childPrefix, i === outgoing.length - 1);
      }

      visited.delete(currentId); // Allow other branches to reach this node
    };

    buildTree(entryId, 0, '', true);
    return output;
  }
}

```

---

#### **Step 6.2: Register the CLI Sub-command**

We add the new `graph` command to your existing Commander setup. This ensures it runs independently of the heavy deobfuscation pipeline.

**Action:**
Update `{{PATH_TO_MAIN_PROCESS_FILE}}` (likely `src/cli.ts` or `src/index.ts`).

```typescript
// {{PATH_TO_MAIN_PROCESS_FILE}}
import fs from 'node:fs/promises';
import path from 'node:path';
import { program } from 'commander';
import { GraphPresenter } from './services/callgraph/presenter';
import { CallGraphData } from './services/callgraph/types';

// ... existing humanify main command ...

// --- NEW SUB-COMMAND ---
program
  .command('graph <directory>')
  .description('Visualize the call graph of a deobfuscated project')
  .option('-e, --entry <id>', 'Specific function ID to trace (e.g., "src/main.js:init")')
  .option('-d, --depth <number>', 'Maximum depth to trace', parseInt)
  .option('-f, --format <type>', 'Output format: "tree" (default) or "mermaid"', 'tree')
  .action(async (directory, options) => {
    try {
      const graphPath = path.join(directory, 'call-graph.json');
      
      // 1. Verify data exists
      let rawData: string;
      try {
        rawData = await fs.readFile(graphPath, 'utf-8');
      } catch (e) {
        console.error(`❌ Error: Could not find ${graphPath}.`);
        console.error(`Did you run 'humanify ${directory}' first to generate the graph?`);
        process.exit(1);
      }

      const graphData: CallGraphData = JSON.parse(rawData);
      const presenter = new GraphPresenter(graphData);
      const maxDepth = options.depth || Infinity;

      // 2. Route based on format
      if (options.format === 'mermaid') {
        const output = presenter.toMermaid(options.entry, maxDepth);
        const outPath = path.join(directory, 'call-graph.mermaid');
        await fs.writeFile(outPath, output);
        console.log(`✅ Mermaid graph saved to ${outPath}`);
        
      } else {
        // Default ASCII Tree output
        if (!options.entry) {
          console.error(`❌ Error: '--entry' is required for ASCII tree format.`);
          console.error(`Use '--format mermaid' to export the entire un-filtered graph.`);
          process.exit(1);
        }
        
        console.log(`\nCall Graph for: ${options.entry}\n`);
        const output = presenter.toAsciiTree(options.entry, maxDepth);
        console.log(output);
      }

    } catch (error: any) {
      console.error(`❌ Error generating graph: ${error.message}`);
    }
  });

program.parse(process.argv);

```

---

#### **Step 6.3: E2E Verification**

To confirm the entire integration is complete:

1. **Deobfuscate a test project:**
Ensure you have a test directory (`test-out`) that has already run through Phases 1-5, meaning `test-out/call-graph.json` exists. Assume it has a function `main.js:init`.
2. **Test ASCII Tree:**
```bash
node {{PATH_TO_DIST}}/cli.js graph ./test-out --entry "main.js:init"

```


*Expected Terminal Output:*
```text
Call Graph for: main.js:init

main.js:init
├── utils.js:setupConfig
│   └── utils.js:parseEnv
└── network.js:connect

```


3. **Test Depth Limit:**
```bash
node {{PATH_TO_DIST}}/cli.js graph ./test-out --entry "main.js:init" --depth 1

```


*Expected Terminal Output:*
```text
Call Graph for: main.js:init

main.js:init
├── utils.js:setupConfig
└── network.js:connect

```


4. **Test Mermaid Export:**
```bash
node {{PATH_TO_DIST}}/cli.js graph ./test-out --format mermaid

```


*Expected:* A success message and a new file `test-out/call-graph.mermaid` containing valid `graph TD` syntax.
