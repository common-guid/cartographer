# Plan: Boilerplate Classification Fix

**Commit Convention:** `Scope: boilerplate` (e.g., `feat(boilerplate): ...`, `test(boilerplate): ...`)

## 1. Overview
When processing JavaScript bundles (such as the `warp` bundle) wrapped in top-level `try/catch` statements or other control-flow blocks (like `if`, `for`, `while` statements), the `BoilerplateClassifier` incorrectly classifies the entire block as boilerplate. This happens because `getStatementCount(node)` falls through and returns `1` statement for unhandled control flow blocks, making them appear as "short functions" (<= 12 statements) to the classifier.

This track corrects `getStatementCount` and `isShortFunction` to count statements recursively and reject non-function nodes.

## Definition of Done
The task is complete when:
1. The `getStatementCount` and `isShortFunction` utilities are updated to correctly and recursively evaluate statement counts in structural blocks.
2. Running the `plan` command on `fixtures/warp` shows the correct non-zero, full application code size estimates.
3. Running the `run` command on `fixtures/warp` succeeds, and the output `bundle.js` has successfully renamed/humanified identifiers.
4. All existing unit tests pass, and new unit tests are added and pass.
5. The manual verification artifacts (screenshots and code diff/comparison) are recorded and saved to the artifact directory.

## Success Criteria
- **Classify Correctness:** The warp bundle `TryStatement` is classified as `app` logic rather than `boilerplate`.
- **Estimation Accuracy:** `plan fixtures/warp` reports `0%` boilerplate reduction and `2,150+` estimated LLM requests.
- **Deobfuscation Completeness:** `run fixtures/warp` produces fully deobfuscated variable/function names.
- **Unit Testing Coverage:** Unit tests specifically verify that structural block statements with $>12$ nested statements are not evaluated as short functions.
- **Validation Artifacts:** A screenshot of the visualizer dashboard and a side-by-side markdown comparison are successfully saved to the conversation's artifact directory.

---

## 2. Tasks

### Phase 1: Unit Testing & Implementation
- [x] **Task 1.1:** Add failing unit tests (Red Phase) to `tests/classifier.test.ts` verifying that large `TryStatement` structures with nested blocks/statements are NOT classified as short functions or boilerplate, and that `getStatementCount` behaves correctly on structural nodes. (16d4883)
- [x] **Task 1.2:** Update `getStatementCount` in `src/services/boilerplate/fingerprints/helpers.ts` to recursively calculate the statement count inside nested blocks and structural statements (try/catch, if, loop, switch). (16d4883)
- [x] **Task 1.3:** Update `isShortFunction` in `src/services/boilerplate/fingerprints/helpers.ts` to return `false` for non-function structures (try/catch, if, loop, switch at the top level). (16d4883)
- [x] **Task 1.4:** Verify all tests pass (Green Phase) using `npm run test` and check for any regressions. (16d4883)
- [x] **Checkpoint 1:** Finalize implementation and verify unit tests pass. Create checkpoint commit. (16d4883)

### Phase 2: End-to-End Verification & Manual Validation
- [~] **Task 2.1:** Execute `plan` command on `fixtures/warp` and verify the output size estimation:
  ```bash
  node dist/cli/run.js plan fixtures/warp
  ```
- [~] **Task 2.2:** Execute `run` command on `fixtures/warp` and verify it succeeds and outputs renamed/humanified identifiers in `test-output-warp/bundle.js`.
- [ ] **Task 2.3:** Run the Visualizer dashboard on port 3325, take a screenshot of the deobfuscated dashboard landing page using Puppeteer, and save the screenshot as `warp_dashboard.png` in the artifact directory.
- [ ] **Task 2.4:** Create a markdown side-by-side comparison `warp_comparison.md` of a 50-line code snippet from `fixtures/warp/bundle.js` before and after deobfuscation.
- [ ] **Checkpoint 2:** Complete E2E manual verification and commit the walkthrough.
