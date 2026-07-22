# Plan: Jules REST API Integration

**Commit Convention:** `Scope: jules` (e.g., `feat(jules): ...`, `test(jules): ...`)

## 1. Overview
Integrate Google's Jules REST API as a whole-file renaming provider (`LLM_PROVIDER=jules`). Instead of token-slicing JavaScript files into local sliding windows for standard HTTP completion endpoints, Cartographer submits pre-processed whole files to Jules' remote cloud sandbox VM via `POST /v1alpha/sessions`. Jules' agent executes Gemini 3.1 Pro reasoning over full-module context and returns the refactored code file.

## Definition of Done
1. **API Service (`JulesService`):** A service (`src/services/llm/jules-service.ts`) manages session creation (`POST /v1alpha/sessions`), status polling (`GET /v1alpha/sessions/{id}`), and output file retrieval (`GET /v1alpha/sessions/{id}/sources`) with backoff and error recovery.
2. **Provider Integration:** Setting `LLM_PROVIDER=jules` routes cleaned source code to `JulesService` without slicing tokens locally.
3. **CLI & Environment Configuration:** `JULES_API_KEY`, `JULES_PROJECT_ID`, and `JULES_API_BASE_URL` are added to [.env.example](file:///home/guid/projects/cartographer/cartographer/.env.example) and validated by CLI runner ([run.ts](file:///home/guid/projects/cartographer/cartographer/src/cli/run.ts)).
4. **Test Coverage:**
   - Unit test suite (`tests/services/llm/jules-service.test.ts`) verifies session creation, polling loops, and error handling using mocked API responses.
   - End-to-end integration verification tests running `LLM_PROVIDER=jules` against test fixtures to ensure valid JS output files and `.metadata.json` sidecars are generated.
5. **Documentation & Dev Log:** `LOGBOOK.md` and Conductor artifacts are updated upon task completion.

## Success Criteria
- **Provider Routing:** `LLM_PROVIDER=jules` is recognized across CLI flags, environment variables, and tracer spans.
- **Whole-File Context:** Single source files are submitted intact rather than chunked into sliding windows.
- **Robust Polling:** Status polling handles `PENDING`, `RUNNING`, `SUCCESS`, and `FAILED` states smoothly with backoff timeouts.
- **Verification Evidence:** Screenshots and diff artifacts of Jules-deobfuscated files are saved to the artifact directory.

---

## 2. Tasks

### Phase 1: Environment & Service Foundation
- [ ] **Task 1.1:** Update [.env.example](file:///home/guid/projects/cartographer/cartographer/.env.example) and [constants.ts](file:///home/guid/projects/cartographer/cartographer/src/config/constants.ts) with `JULES_API_KEY`, `JULES_PROJECT_ID`, and `JULES_API_BASE_URL` configuration defaults.
- [ ] **Task 1.2:** Add failing unit tests (Red Phase) in `tests/services/llm/jules-service.test.ts` for session payload creation, status polling, and error handling.
- [ ] **Task 1.3:** Create `src/services/llm/jules-service.ts` to handle REST requests to `/v1alpha/sessions`, session polling, and file artifact downloads.
- [ ] **Task 1.4:** Verify unit tests pass (Green Phase) with `npm run test tests/services/llm/jules-service.test.ts`.

### Phase 2: Orchestrator & CLI Provider Integration
- [ ] **Task 2.1:** Update [humanify-service.ts](file:///home/guid/projects/cartographer/cartographer/src/services/llm/humanify-service.ts) to recognize `jules` as an `LLM_PROVIDER` and delegate whole-file renaming to `JulesService`.
- [ ] **Task 2.2:** Update [run.ts](file:///home/guid/projects/cartographer/cartographer/src/cli/run.ts) to validate Jules environment variables and display provider status during execution.
- [ ] **Task 2.3:** Add integration unit tests verifying provider dispatch and whole-file routing when `LLM_PROVIDER=jules`.

### Phase 3: Verification & Walkthrough
- [ ] **Task 3.1:** Execute deobfuscation test using mocked/live Jules provider on sample fixture.
- [ ] **Task 3.2:** Capture visual verification screenshots and markdown diffs of the output.
- [ ] **Task 3.3:** Finalize documentation and update `LOGBOOK.md`.
