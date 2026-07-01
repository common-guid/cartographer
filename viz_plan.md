# Visualizing the JS Cartographer Network Graph

We need to turn the current placeholder web app into a rich, interactive visualization dashboard that consumes the `/api/graphs` and `/api/files` endpoints. Based on the project's `UX.md` specifications, the ultimate goal is a **split-pane view**: an interactive graph on the left, and a synchronized code editor on the right.

## Visualization Stack
- **Graph Visualizer**: **Sigma.js** (via `react-sigma-v2`) for rendering the graph to guarantee high performance with massive codebases.
- **Styling**: **Vanilla CSS** to keep dependencies lightweight and focus on structural layout.
- **Editor**: `@monaco-editor/react` for the code view.
- **State Management**: **Zustand** to hold global state (`selectedNodeId`, `graphData`, `fileContent`).
- **Location**: `src/explorer/client` (A Vite React SPA).

## Proposed Implementation Plan

### Phase 1: SPA Scaffolding & Server Integration
*   Create a new Vite + React + TypeScript project in `src/explorer/client`.
*   Configure the Express server (`src/explorer/server.ts`) to serve the compiled static assets from the React app instead of the hardcoded HTML string.
*   **Success Criteria:** Running the app launches the Express server, which successfully serves a basic "Hello World" React app at `http://0.0.0.0:<port>`.

### Phase 2: State Management & API Integration
*   Set up **Zustand** to hold the global state.
*   Write API fetching hooks to consume `/api/graphs` and `/api/file?path=...`.
*   **Success Criteria:** The React app successfully fetches the graph data from the backend on load and stores it in the Zustand store without network or parsing errors.

### Phase 3: The Graph Visualizer (Left Pane)
*   Implement the graph visualization component using Sigma.js.
*   Map the raw `callGraph` and `moduleGraph` JSON structures into nodes and edges for Sigma.js.
*   Add click listeners to nodes that update the `selectedNodeId` in Zustand.
*   **Success Criteria:** The graph renders successfully on the left side of the screen with nodes and edges. Clicking a node updates the global state.

### Phase 4: The Code Editor (Right Pane)
*   Integrate `@monaco-editor/react`.
*   When a node is selected in the graph, fetch the corresponding file and load it into Monaco.
*   **Success Criteria:** The UI displays a split pane. Clicking a node in the graph fetches the actual file content and displays it syntax-highlighted in the Monaco editor on the right.

## Verification Plan

### Automated Tests
*   **Visual Validation:** Implement a Puppeteer script that navigates to the dashboard, waits for the canvas to load, takes a screenshot of the visualization, and sends it to Gemini (via the `agy` CLI: `agy ask "Confirm there is a network graph visible in this image. Answer with just YES or NO." --image screenshot.png`) to programmatically confirm that the visualization rendered correctly.

### Manual Verification
*   Open `http://0.0.0.0:<port>` in the browser.
*   Verify the Sigma.js graph renders without crashing.
*   Click a node in the graph and verify the right-hand code editor updates with the correct file contents.
