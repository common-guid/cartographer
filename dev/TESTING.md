# JS Cartographer (v3 Greenfield): Testing & Success Criteria

This document defines the strict, unambiguous "Definition of Done" and testing requirements for each phase of the implementation plan. The executing agent MUST satisfy all criteria in a given phase before proceeding to the next.

## Phase 1: Foundation & The Unified AST Service

### Objective
Ensure the project is correctly configured for native ECMAScript Modules (ESM) and that the centralized Babel wrapper successfully mitigates all CommonJS (CJS) interop issues.

### Definition of Done Checklist
- [ ] `package.json` is initialized with `"type": "module"`.
- [ ] `tsconfig.json` is configured for Node ESM (e.g., `"module": "NodeNext"`, `"moduleResolution": "NodeNext"`).
- [ ] Required dependencies are installed (`@babel/core`, `@babel/traverse`, `@babel/generator`, `typescript`, `vitest`).
- [ ] `src/services/ast/babel-core.ts` is implemented and exposes `parseCode`, `traverseAst`, and `generateCode`.
- [ ] `tests/ast-service.test.ts` is implemented to explicitly test parsing, traversing, and generating.
- [ ] Running `npx vitest run` passes 100% of tests.
- [ ] Running `npm run build` succeeds without TypeScript compilation errors.

### Test Specification (`tests/ast-service.test.ts`)
The test suite must verify the CJS/ESM interop by performing a complete AST cycle:
1. **Parse:** Pass a raw JS string (e.g., `const x = 42;`) to the service and assert a valid AST object is returned.
2. **Traverse:** Use the service to traverse the AST, visiting a specific node (e.g., `VariableDeclarator`), proving that the Babel visitor engine is functional.
3. **Generate:** Use the service to generate code from the AST, asserting the output matches the semantic intent of the input string.

## Phase 2: The Map-Reduce In-Memory Pipeline

### Objective
Establish the foundational file-processing loop, correctly handling the boundary between Wakaru (string processing) and Babel (AST processing), and implement the AST heuristic filter to skip standard variables.

### Definition of Done Checklist
- [ ] `src/services/sanitizer/wakaru-service.ts` is implemented and can execute basic structural transforms (e.g. `un-sequence-expression`).
- [ ] `src/services/llm/identifier-filter.ts` is implemented to filter variables that should NOT be renamed.
- [ ] `src/cli/orchestrator.ts` (or equivalent file map loop) is stubbed out, demonstrating the String $\rightarrow$ Wakaru $\rightarrow$ AST flow.
- [ ] `tests/wakaru.test.ts` is implemented and passes.
- [ ] `tests/identifier-filter.test.ts` is implemented and passes.
- [ ] `npx vitest run` passes 100%.

### Test Specification
1. **Wakaru Boundary (`tests/wakaru.test.ts`)**:
   - Provide a transpiled string (e.g., `var a=1,b=2;`).
   - Assert that the Wakaru service correctly de-transpiles it into discrete statements without crashing.
2. **Identifier Filter (`tests/identifier-filter.test.ts`)**:
   - Provide a Babel AST containing a mix of standard globals (`window`, `Promise`), descriptive names (`loginUser`), and obfuscated names (`_0x4f2`, `a`, `b`).
   - Assert that the filter flags `window`, `Promise`, and `loginUser` to be skipped.
   - Assert that `_0x4f2`, `a`, and `b` are flagged as requiring LLM renaming.

## Phase 3: Cloud-First LLM Renaming

### Objective
Implement the core AI renaming logic, ensuring that AST scopes are traversed correctly, context is sent to the LLM, structured JSON is parsed, and AST variables are safely renamed.

### Definition of Done Checklist
- [ ] `src/services/llm/rename-service.ts` is implemented.
- [ ] Scope traversal logic correctly visits scopes (ideally outer-to-inner) and constructs stringified context windows.
- [ ] LLM integration handles structured JSON responses mapping `{"oldVar": "newVar"}`.
- [ ] Variables in the AST are safely renamed using Babel's scope manipulation methods to prevent collisions.
- [ ] `tests/rename-service.test.ts` is implemented using a mocked LLM provider to ensure deterministic testing.
- [ ] `npx vitest run` passes 100%.

### Test Specification
1. **Rename Service Logic (`tests/rename-service.test.ts`)**:
   - Instantiate `RenameService` with a **Mock LLM Provider** that always returns a predictable JSON object (e.g., `{"a": "renamedA"}`).
   - Pass an AST containing obfuscated code (`function test(a) { return a + 1; }`).
   - Assert that the service correctly calls the mocked LLM with the context string.
   - Assert that the AST is safely modified (`function test(renamedA) { return renamedA + 1; }`).

## Phase 4: Local Graph Extraction

### Objective
Extract static analysis metadata from the AST without relying on global path resolution, safely caching the results to disk.

### Definition of Done Checklist
- [ ] `src/services/graph/extractor-service.ts` is implemented.
- [ ] The extractor correctly visits the AST to find imports, exports, function definitions, and calls.
- [ ] The orchestrator successfully outputs both the formatted `.js` file and its `.metadata.json` sidecar to the output directory.
- [ ] `tests/extractor.test.ts` is implemented and passes 100%.

### Test Specification
1. **Extractor Logic (`tests/extractor.test.ts`)**:
   - Provide a mock AST containing an import, a defined function, and a function call.
   - Assert that the extractor returns a `FileMetadata` object capturing these nodes correctly.

## Phase 5: Graph Aggregation

### Objective
Stitch together the local `.metadata.json` files using a robust module resolver to create the global graph artifacts.

### Definition of Done Checklist
- [ ] `src/services/graph/reducer-service.ts` is implemented.
- [ ] `enhanced-resolve` is configured to correctly map paths (including extensionless imports or aliases) inside the Webcrack output directory.
- [ ] The reducer correctly outputs `module-graph.json`, `call-graph.json`, and `api-surface.json`.
- [ ] `tests/reducer.test.ts` is implemented and passes 100%.

### Test Specification
1. **Reducer Logic (`tests/reducer.test.ts`)**:
   - Mock a directory containing 2 interconnected `.metadata.json` files.
   - Run the reducer and assert that `module-graph.json` properly links the two files based on their resolved paths.

## Phase 6: CLI & Local Dashboard

### Objective
Expose the pipeline to the user via a terminal command and serve the interactive React visualizer.

### Definition of Done Checklist
- [ ] `src/cli/run.ts` correctly wires up the CLI arguments and initiates the Map-Reduce pipeline.
- [ ] `src/explorer/server.ts` uses Express to serve a local web dashboard and expose the `/api/graphs` endpoints.
- [ ] Manual or automated E2E testing confirms that running `humanify run` against a sample obfuscated file successfully completes the pipeline and starts the dashboard without crashing.
