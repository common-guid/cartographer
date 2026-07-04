# JS Cartographer (v3 Greenfield Restart): Product Requirements Document

## 1. Executive Summary
JS Cartographer is a local CLI tool and web dashboard that ingests raw, bundled Webpack JavaScript files, reconstructs the dependency and call graphs, and utilizes Generative AI (Cloud-First LLMs) to "un-minify" variables into human-readable labels. 
**Objective:** Transform obfuscated bundles into a readable, semantic architecture diagram and codebase.

## 2. Core Architecture (The Map-Reduce Pipeline)
The system operates as a **v1-style local Node.js CLI** that hosts its own **Express server and React dashboard**. To solve previous disk I/O and CPU bottlenecks, the system uses a **Map-Reduce In-Memory Pipeline**:

### 2.1 The Map Phase (Per-File Processing)
For each file extracted from the bundle, the system processes it individually:
1. **Wakaru Sanitization:** Processes the raw string to de-transpile constructs (e.g., generator state machines to async/await).
2. **Centralized AST Parsing:** Parses the Wakaru-cleaned string into a Babel AST using a unified, ESM-safe Babel wrapper service.
3. **LLM Renaming (Cloud-First):** Traverses the AST in memory and uses Gemini/OpenAI structured JSON outputs to contextually rename variables.
4. **Static Analysis Extraction:** Extracts local imports, exports, API sinks, and function calls from the AST.
5. **Disk Write:** Saves the cleaned, renamed `.js` file and a `.metadata.json` state file. This ensures fault tolerance against LLM rate limits.

### 2.2 The Reduce Phase (Graph Aggregation)
1. **Graph Stitching:** Reads all local `.metadata.json` files and uses `enhanced-resolve` to accurately map module paths (handling aliases and extensionless imports).
2. **Global Output:** Generates project-wide `module-graph.json`, `call-graph.json`, and `api-surface.json`.

## 3. Visualizer
The CLI hosts a local Express server that serves an interactive React SPA (using Sigma.js/React Flow and Monaco Editor) to visualize the generated files and graphs.

## 4. Execution Strategy & Constraints
- **ESM-First Build:** The CLI must be built as an ES Module. Babel imports must be wrapped in a centralized interop service.
- **Wakaru API Boundary:** Wakaru processes strings, not ASTs. Thus, Wakaru runs *before* Babel parsing.
- **Cost Management:** Built-in heuristics and identifier filtering (e.g., skipping `window`, single chars) reduce LLM token usage.
