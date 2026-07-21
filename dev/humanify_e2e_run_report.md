# Cartographer Humanify Integration - Automated E2E Run Report

**Date:** 2026-07-04 | **Fixture:** `fixtures/webpack-hello-world` | **Status:** 🟢 PASSED

This report validates the end-to-end integration between the **HumanifyService**, the **PipelineOrchestrator**, the **Reducer Phase**, the **Express API**, and the **React Dashboard**.

---

## 📊 Phase 1 & 2: Pipeline Execution & Graph Generation
*   **CLI Run:** SUCCESS (Exit code 0, all expected files generated)
*   **Sidecars:** SUCCESS (`bundle.js.metadata.json` correctly written)
*   **Heuristic + LLM Renaming Ratio:** **85.7%** (Required: >=80.0%)
*   **Result:** Nodes correctly aggregated into global graph artifacts.

---

## 🔒 Phase 3: Backend API Validation
*   **`GET /api/files`:** SUCCESS (Returned files list containing `bundle.js`)
*   **`GET /api/graphs`:** SUCCESS (Returned valid call and module graphs)
*   **`GET /api/file?path=bundle.js`:** SUCCESS (Returned deobfuscated source code)
*   **Path Traversal Prevention:** SUCCESS (Traversals to parent directories correctly rejected with HTTP 400/403)

---

## 🖥️ Phase 4 & 5: Frontend Web UI & Visual Verification
*   **Dashboard Loading:** SUCCESS (Sigma.js canvas successfully loaded)
*   **Interaction Synchronization:** SUCCESS (Programmatic selection of function node `o` resolved correctly)
*   **Context Metadata Card:** SUCCESS (Successfully correlated node to definition at `bundle.js:16`)
*   **Monaco Editor Synchronization:** SUCCESS (Monaco editor loaded humanified source code corresponding to selected node)

### 📸 Visual Evidence
The following screenshots were programmatically captured during the browser automation stage:

1. **Graph View (Initial State):**
   ![Graph View](./dist-output-e2e/reports/graph_view.png)

2. **Synchronized Editor View (After selecting node):**
   ![Editor View](./dist-output-e2e/reports/editor_view.png)

---

**Execution Duration:** 2.92s
