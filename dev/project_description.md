# JS Cartographer (cartographerjs): Architectural & Implementation Specification

JS Cartographer is an AI-powered JavaScript deobfuscator, code humanizer, and semantic mapper. It combines deterministic Abstract Syntax Tree (AST) transpilation recovery (via Wakaru and Webcrack) with Large Language Models (LLMs) to reconstruct minified, obfuscated, or bundled JavaScript code into human-readable, semantically annotated source files. Beyond deobfuscation, it constructs dependency and call graphs, reconstructs API surfaces, and hosts an interactive React Flow Web Explorer.

---

## 1. Intent and Objective

The primary objective of JS Cartographer is to solve the problem of reversing JavaScript minification and obfuscation. While traditional tools (such as beautifiers and decompilers) can restore formatting, they cannot recover original developer intent represented by semantic variable and function names. Conversely, raw LLMs fail at restructuring transpiled generator machines, ES6 classes, or JSX.

JS Cartographer bridges this gap by decoupling **structural recovery** (handled deterministically via AST transformations) from **semantic naming** (handled probabilistically via LLMs). The output is a readable codebase that maintains 1:1 behavioral equivalence, mapped into structured graphs that trace modules, call hierarchies, and API endpoints.

---

## 2. Core Architecture & Pipeline Flow

The deobfuscation pipeline accepts a minified/bundled JS file and runs a staged series of transformations:

```
[Input Bundle]
      │
      ▼
1. Webcrack (Unbundling)  ─── Splits Webpack/CJS bundles into individual files
      │
      ▼
2. Sourcemap Injection (Opt) ─── Injects original names from .js.map (locked symbols)
      │
      ▼
3. Wakaru Sanitizer       ─── Structural de-transpilation (async/await, classes, sequence splitting)
      │
      ▼
4. AST Identifier Filter  ─── Identifies obfuscated symbols vs. meaningful names
      │
      ▼
5. LLM Renaming Stage     ─── Queries LLMs (Gemini, OpenAI, Local) to rename remaining symbols
      │
      ▼
6. Prettier Formatting    ─── Standardizes output syntax
      │
      ▼
7. Graph & API Extraction ─── Generates module-graph.json, call-graph.json, and api-surface.json
      │
      ▼
[Output Directory]
```

### Staged Pipeline Orchestrator (`src/unminify.ts`)
The orchestrator manages state caching (`StateCache`) to avoid re-processing unmodified files. Files are processed in parallel using a concurrency limiter (`pLimit`), applying retries with exponential backoff on LLM requests.

---

## 3. Detailed Component Specifications

### 3.1. Webcrack (Unbundling)
Processes webpack-bundled files, extracts internal module registry functions (CJS modules), maps numerical module IDs (e.g., `42`) to virtual file paths (e.g., `src/modules/42.js`), and writes them to the output directory.

### 3.2. Sourcemap Truth Injection (`src/services/sourcemap/index.ts`)
> [!NOTE]
> Sourcemap injection is **entirely optional**. JS Cartographer does not require a sourcemap to deobfuscate code; if omitted, it simply skips this stage and relies on AST sanitization and LLM heuristics.

If a `.js.map` file is provided, JS Cartographer extracts the original identifiers mapping to their generated positions:
1. Instantiates a `SourceMapConsumer` (from the `source-map` package).
2. For each AST identifier node, queries `originalPositionFor({ line: genLine, column: genColumn })`.
3. If an original name (`pos.name`) exists, it is instantly written into the AST and **locked** (marked as visited).
4. Locked names act as **contextual anchors** to help the LLM rename the surrounding code.

### 3.3. Wakaru Sanitizer (`src/services/sanitizer/index.ts`)
Applies deterministic AST-to-AST rewrites using `@wakaru/unminify` loaded dynamically via CommonJS `createRequire`.

#### Structural Rules (`STRUCTURAL_RULES`):
- `un-async-await`: Restores `async/await` syntax from Babel/TypeScript generator state machines (`_regeneratorRuntime`).
- `un-es6-class`: Restores prototype chains, constructor assignments, and getters/setters back into ES6 `class` definitions.
- `un-jsx`: Recovers declarative JSX syntax from `React.createElement` or `_jsx` calls.
- `un-optional-chaining` & `un-nullish-coalescing`: Rebuilds `obj?.prop` and `val ?? fallback` from compiler ternary patterns.
- `un-template-literals`: Rebuilds backtick template strings from string concatenations.
- `un-sequence-expression`: Splits comma-separated sequences (e.g. `a = 1, b = 2, c()`) into separate statements. **Critical step** to prevent context pollution in LLM prompts.
- `un-variable-merging`: Splits compound variable declarations (`var a, b, c`) into individual lines.
- `un-flip-comparisons`: Normalizes Yoda conditions (e.g. `null === x` becomes `x === null`).

#### Heuristic Rules (`HEURISTIC_RULES`):
- `un-undefined`: Replaces `void 0` with `undefined`.
- `un-infinity`: Replaces `1/0` with `Infinity`.
- `un-numeric-literal`: Simplifies hex/octal representations (e.g., `0x1a` becomes `26`).
- `smart-rename`: Performs basic static renames of variables bound directly to standard web/DOM/Node APIs.

### 3.4. Identifier Filter (`src/plugins/local-llm-rename/identifier-filter.ts`)
To reduce LLM tokens and API cost by 40–60%, only likely-obfuscated identifiers are processed.
- **Static Skip List:** Built-in JS globals (`Array`, `Promise`, `window`), Node globals (`process`, `Buffer`), and Webpack internals (`__webpack_require__`) are preserved.
- **Obfuscation Detection:** Always renames single-character names (`a`, `x`, `_`, `$`) and hexadecimal patterns matching `/^_0x[0-9a-fA-F]+$/`.
- **Heuristic Quality Check:** Skips camelCase names that are $\ge 6$ characters and contain at least one vowel, assuming they represent pre-existing descriptive names.

### 3.5. Scope Traversal & Rename Locking (`visitAllIdentifiers.ts`)
1. Parses the code into an AST using `@babel/parser` with `jsx` and `typescript` plugins.
2. Identifies all binding nodes using `BindingIdentifier` visitors.
3. Calculates the character size of each binding's scope block:
   $$\text{scopeSize} = \text{block.end} - \text{block.start}$$
4. Sorts the scopes in **descending order** of size to resolve parent-child naming dependencies outer-to-inner.
5. For each variable:
   - Evaluates the Filter. If skipped or mapped by sourcemap, applies the rename immediately to the scope.
   - Extracts a context-window string (`scopeToString()`) around the identifier.
   - Calls the LLM visitor callback to obtain a renamed string.
   - Normalizes to a safe identifier name. If a duplicate exists in the scope, appends underscores (e.g., `_myVar`) to prevent collisions.
   - Applies the rename to the Babel scope via `smallestScope.scope.rename()`.
6. Generates code from the modified AST using `transformFromAstAsync`.

### 3.6. LLM Renaming Implementations
Support exists for multiple providers (Gemini, OpenAI, OpenRouter, and Local LLM).

#### Local LLM (GBNF Grammar Constrained - `gbnf.ts` / `llama.ts`):
Local mode uses `node-llama-cpp` to load GGUF models. It guarantees output structure by passing a GBNF (GGML BNF) grammar to the inference engine:
1. Ask the model to describe the variable's purpose:
   `gbnf"A good description for '{variableName}' is: {regex_pattern}."`
2. Ask for a TypeScript-compatible variable/function name based on the description:
   `gbnf"A good name would be '{regex_pattern}'"`

#### Framework-Aware Prompts (`src/services/heuristics/framework-detector.ts`):
A Babel AST pass inspects files for specific framework signatures (such as React imports/JSX or Express middleware).
If detected, framework-specific conventions are injected into the LLM system prompt:
- **React SOPs:** Enforce PascalCase components, `use`-prefixed custom hooks, state destructuring pairs (`[value, setValue]`), and `handle`/`on` event handlers.
- **Express SOPs:** Enforce `(req, res, next)` handler parameter names, `app` for applications, and `router` for Express Router instances.

---

## 4. Graph Construction and API Surface Analysis

### 4.1. Module Dependency Graph (`src/services/graph/index.ts`)
Generates a `module-graph.json` structure mapping project modules.
- **Visitor Identifiers:**
  - `ImportDeclaration`: Records source module paths (e.g. `import x from './auth'`).
  - `CallExpression`: Detects CommonJS imports (`require('module')`).
  - `ExportNamedDeclaration` & `ExportDefaultDeclaration`: Indexes exported functions, variables, and default bindings.
- **Output Schema:**
  ```json
  {
    "files": {
      "src/app.js": {
        "id": "src/app.js",
        "imports": ["src/utils.js"],
        "exports": ["startApp"]
      }
    },
    "entryPoint": "src/app.js"
  }
  ```

### 4.2. Semantic Call Graph (`src/services/callgraph/index.ts`)
Processes the renamed output directory to build a function call hierarchy.
1. **Pass 1 (Function Indexing):** Traverses the AST of each file, registers function definitions as unique node IDs (`filename:functionName`), and maps import specifiers to their origin files.
2. **Pass 2 (Call Edge Mapping):** Inspects `CallExpression` nodes. For every function invocation:
   - Obtains the enclosing function parent (the caller).
   - If the callee resolves to a mapped import, creates an `"external"` call edge.
   - If the callee is defined locally, creates an `"internal"` call edge.
- **Output Schema:**
  ```json
  {
    "nodes": {
      "src/app.js:startApp": {
        "id": "src/app.js:startApp",
        "file": "src/app.js",
        "name": "startApp",
        "line": 12
      }
    },
    "edges": [
      {
        "from": "src/app.js:startApp",
        "to": "src/utils.js:parseConfig",
        "type": "external"
      }
    ]
  }
  ```

### 4.3. API Surface Reconstructor (`src/services/api-analyzer/index.ts`)
Statically extracts endpoints, request payloads, and query structures:
- **Sink Discovery (`sink-discovery.ts`):** Visitors detect calls to `fetch()` and `axios` configurations.
  - Resolves destination URL strings by tracking parent declarations, scope variables, binary string additions (`+`), and template strings (`${...}`).
  - Resolves HTTP verbs (`GET`, `POST`, etc.) from options parameters.
  - Infers parameter types (`string`, `number`, `boolean`) and extracts request body keys.
- **Surface Builder:** Combines sinks, computes the common `baseUrl` using longest common prefix matching, and outputs an aggregated `api-surface.json`.
- **OpenAPI Exporter:** Automatically exports `api-surface.json` to a valid OpenAPI 3.0.0 JSON specification.

---

## 5. Visualizer and Web Explorer Architecture

### 5.1. Backend Express Server (`src/explorer/server.ts`)
Launches on `0.0.0.0` and hosts the static React application along with API endpoints:
- `GET /api/files`: Lists files recursively (with directory traversal validation `isPathSafe`).
- `GET /api/file?path=<relative>`: Retrieves content of a specific file.
- `GET /api/graphs`: Serves `module-graph.json`, `call-graph.json`, and `api-surface.json` as a single payload.

### 5.2. Frontend React Application
An interactive client SPA designed with React Flow and Monaco Editor:
- **Left Panel (Interactive Graphs):** Renders module import links and function call trees with search filtering, zoom, and node selection.
- **Right Panel (Source Code Editor):** Displays Monaco Editor loaded with the selected source file.
- **Bidirectional Sync (Zustand State):**
  - Clicking a node in the React Flow panel highlights the function/module line in Monaco.
  - Selecting a token or function call in Monaco centers and highlights the corresponding node in the graph panel.

