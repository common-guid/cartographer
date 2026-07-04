# Visualizing the JS Cartographer Network Graph

We need to turn the current placeholder web app into a rich, interactive visualization dashboard that consumes the `/api/graphs` and `/api/files` endpoints. Based on the project's `UX.md` specifications, the ultimate goal is a **split-pane view**: an interactive graph on the left, and a synchronized code editor on the right.

## Visualization Stack
- **Graph Visualizer**: **Sigma.js** (via `@react-sigma/core`) for rendering the graph to guarantee high performance with massive codebases.
- **Styling**: **Vanilla CSS** to keep dependencies lightweight and focus on structural layout.
- **Editor**: `@monaco-editor/react` for the code view.
- **State Management**: **Zustand** to hold global state (`selectedNodeId`, `graphData`, `fileContent`).
- **Location**: `src/explorer/client` (A Vite React SPA).

## Proposed Implementation Plan

### Phase 1: SPA Scaffolding & Server Integration
*   Create a new Vite + React + TypeScript project in `src/explorer/client`.
*   Configure the Express server (`src/explorer/server.ts`) to serve the compiled static assets from the React app instead of the hardcoded HTML string.
*   **Success Criteria / Tests:**
    *   [x] **Test 1.1:** Directory `src/explorer/client` exists and contains a standard Vite React TypeScript template.
    *   [x] **Test 1.2:** Running `npm run build` inside `src/explorer/client` successfully builds static assets.
    *   [x] **Test 1.3:** Express server serves the frontend `index.html` when hitting `http://0.0.0.0:<port>`.
    *   [x] **Test 1.4:** Express server serves frontend static assets (JS, CSS) referenced by `index.html` without 404 errors.

### Phase 2: State Management & API Integration
*   Set up **Zustand** to hold the global state.
*   Write API fetching hooks to consume `/api/graphs` and `/api/file?path=...`.
*   **Success Criteria / Tests:**
    *   [x] **Test 2.1:** Zustand store is created with states for `selectedNodeId`, `graphData`, and `fileContent`.
    *   [x] **Test 2.2:** The React app performs a successful `fetch` request to `/api/graphs` on mount.
    *   [x] **Test 2.3:** The fetched graph data is successfully loaded into the Zustand store.
    *   [x] **Test 2.4:** Programmatic updates to `selectedNodeId` successfully trigger a `fetch` request to `/api/file?path=<path>` and populate `fileContent`.

### Phase 3: The Graph Visualizer (Left Pane)
*   Implement the graph visualization component using Sigma.js.
*   Map the raw `callGraph` and `moduleGraph` JSON structures into nodes and edges for Sigma.js.
*   Add click listeners to nodes that update the `selectedNodeId` in Zustand.
*   **Success Criteria / Tests:**
    *   [x] **Test 3.1:** Sigma.js container component mounts and is styled via vanilla CSS to occupy the left side of the viewport.
    *   [x] **Test 3.2:** Graph data from the Zustand store is successfully mapped to Sigma.js compatible node/edge structures.
    *   [x] **Test 3.3:** Sigma.js renders all mapped nodes and edges on the canvas.
    *   [x] **Test 3.4:** Clicking on any node in the Sigma.js visualizer updates the Zustand store's `selectedNodeId`.

### Phase 4: The Code Editor (Right Pane)
*   Integrate `@monaco-editor/react`.
*   When a node is selected in the graph, fetch the corresponding file and load it into Monaco.
*   **Success Criteria / Tests:**
    *   [x] **Test 4.1:** Monaco Editor mounts and is styled via vanilla CSS to occupy the right side of the viewport (split-pane layout).
    *   [x] **Test 4.2:** Selecting a node in the graph fetches the corresponding file content and displays it in Monaco.
    *   [x] **Test 4.3:** Monaco Editor operates in read-only mode and displays syntax highlighting.
    *   [x] **Test 4.4:** Graph nodes dim/highlight based on the selected node's callers and callees.

## Verification Plan

### Automated Tests
*   **Visual Validation:** Implement a Puppeteer script that navigates to the dashboard, waits for the canvas to load, takes a screenshot of the visualization, and sends it to Gemini (via the `agy` CLI: `agy ask "Confirm there is a network graph visible in this image. Answer with just YES or NO." --image screenshot.png`) to programmatically confirm that the visualization rendered correctly.
    *   [x] **Test Visual Validation:** `npm run test:visual` executed successfully and confirmed visual rendering of call graph with nodes and edges.

### Manual Verification
*   Open `http://0.0.0.0:<port>` in the browser.
*   Verify the Sigma.js graph renders without crashing.
*   Click a node in the graph and verify the right-hand code editor updates with the correct file contents.
