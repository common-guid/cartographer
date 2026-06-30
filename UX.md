# JS Cartographer: UX & UI Wireframe Specification

## 1. Why this is necessary
While the backend pipeline does the heavy lifting, the primary value of JS Cartographer is derived from its visualization. The local React dashboard is a complex Single Page Application (SPA) requiring bidirectional state synchronization between a WebGL canvas and a code editor. This document outlines the interface structure and interaction models to ensure frontend development remains focused.

---

## 2. High-Level Layout (The Split-Pane View)

The application utilizes a classic IDE-style layout, maximizing screen real-estate for the two most important elements: the graph and the code.

```text
+-----------------------------------------------------------------------------+
|  [Logo] JS Cartographer   |  [🔍 Search Nodes...]  |  [⚙️ Settings]         |
+---------------------------+-------------------------------------------------+
|                           |                                                 |
|                           |   // src/utils/auth.js                          |
|                           |   import { fetchConfig } from './config';       |
|      (LEFT PANE)          |                                                 |
|                           |   export async function loginUser(credentials) {|
|    Graph Visualizer       |       const token = await fetchConfig();        |
|    (Sigma.js / WebGL)     |       // ...                                    |
|                           |   }                                             |
|   (Interactive Nodes      |                                                 |
|    & Edges)               |      (RIGHT PANE)                               |
|                           |                                                 |
|                           |    Monaco Code Editor                           |
|                           |    (Read-only, Syntax Highlighted)              |
|                           |                                                 |
|                           |                                                 |
+---------------------------+-------------------------------------------------+
|  [Status] Loaded 4,203 nodes | Selected: loginUser() | Line: 42             |
+-----------------------------------------------------------------------------+
```

---

## 3. Core UI Components

### 3.1 Header Toolbar
* **Graph Type Toggle:** Switch between `Module Graph` (file dependencies) and `Call Graph` (function execution).
* **Global Search:** A fast, fuzzy-search input. Typing here dims non-matching nodes on the canvas.
* **Depth Filter:** A slider (e.g., 1 to 5 degrees) controlling how many connected nodes to render around a focused node (crucial for performance on massive bundles).

### 3.2 Left Pane: Graph Visualizer
* **Renderer:** Sigma.js v2 (WebGL) for high-performance rendering of 10,000+ nodes.
* **Nodes:** Represent functions (Call Graph) or files (Module Graph).
* **Edges:** Represent function invocations or imports. Directional arrows indicate flow.
* **Visual Cues:**
  * External imports or "API Sinks" are color-coded differently than local functions.
  * Orphan nodes (dead code) cluster separately.

### 3.3 Right Pane: Monaco Code Editor
* **Renderer:** `@monaco-editor/react`.
* **State:** Strictly read-only.
* **Features:** Standard JS/TS syntax highlighting, line numbers, and minimap.

### 3.4 Context Panel (Bottom/Footer)
Displays metadata for the currently selected node:
* **Identity:** `Original Obfuscated Name: _0x4a2b` $\rightarrow$ `Renamed: validateCredentials`
* **File Path:** `src/modules/auth.js`
* **Lexical Breadcrumbs:** `auth.js > AuthClass > validateCredentials`

---

## 4. Interaction Models (Zustand State Sync)

The UI relies on a global state manager (Zustand) to handle bidirectional syncing without cascading re-renders.

### Interaction A: Graph $\rightarrow$ Code (Clicking a Node)
1. User clicks the node `loginUser` in the graph.
2. Zustand state updates `selectedNodeId`.
3. The right pane detects the change, loads the contents of `src/utils/auth.js` into Monaco.
4. Monaco programmatically scrolls to line 42 and highlights the `loginUser` function block.
5. The graph dims all nodes *except* the direct callers and callees of `loginUser`.

### Interaction B: Code $\rightarrow$ Graph (Cursor Tracking)
1. User clicks inside the `fetchConfig()` call in the Monaco editor.
2. Monaco fires an `onDidChangeCursorPosition` event.
3. The app resolves the cursor line number to a mapped function node ID.
4. Zustand state updates `selectedNodeId`.
5. The WebGL canvas automatically pans/zooms to center the `fetchConfig` node on the screen.
