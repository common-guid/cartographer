# Project Workflow

## Guiding Principles
1. **The Plan is the Source of Truth:** All work must be tracked in `plan.md`.
2. **The Tech Stack is Deliberate:** Changes to the tech stack must be documented in `tech-stack.md` *before* implementation.
3. **Test-Driven Development:** Write unit tests before implementing functionality.
4. **High Code Coverage:** Aim for >80% code coverage for all new modules.
5. **CLI & Web Experience First:** Code changes must keep the CLI stable, clean, and fast, and preserve the responsive integrity of the local visualizer dashboard.
6. **Non-Interactive & CI-Aware:** Prefer non-interactive commands. Use `CI=true` for watch-mode tools (tests, linters) to ensure single execution.

## Task Workflow
All tasks follow a strict lifecycle:
1. **Select Task:** Choose the next available task from `plan.md` in sequential order.
2. **Mark In Progress:** Change status from `[ ]` to `[~]`.
3. **Write Failing Tests (Red Phase):** Write unit/integration tests that fail as expected.
4. **Implement (Green Phase):** Write code to make tests pass.
5. **Refactor:** Clean up code without modifying external behaviors, keeping tests green.
6. **Verify Coverage:** Run test suite with coverage coverage checks (`npx vitest run --coverage`).
7. **Document Deviations:** Adjust `tech-stack.md` if any structural changes deviate from original plans.
8. **Commit Changes:** Use structured commit messages (e.g., `feat(llm): ...`).
9. **Attach Git Notes:** Append a short git note containing a task summary using `git notes add -m "<summary>" <commit_hash>`.
10. **Record Commit SHA:** Mark the task `[x]` and record the first 7 characters of the SHA in `plan.md`.

## Phase Completion Checkpointing Protocol
Immediately after completing tasks concluding a phase in `plan.md`:
1. Announce Phase Completion.
2. List changed files: `git diff --name-only <previous_checkpoint_sha> HEAD` (pruning non-code files). Ensure all new code modules have corresponding tests.
3. Run test command: `npm run test` (and verify no failures).
4. Propose step-by-step Manual Verification Plan.
5. Await user feedback.
6. Create Checkpoint Commit (`conductor(checkpoint): Checkpoint end of Phase X`).
7. Attach Auditable Verification Report as a git note.
8. Record checkpoint SHA in `plan.md` (e.g. `[checkpoint: <sha>]`).

## Development Commands
* **Setup:** `npm install`
* **Daily Development:** `npm run build` (transpile TypeScript to `dist/`), `npm run test` (run Vitest test suite), `node dist/cli/run.js` (execute CLI).
* **Before Committing:** `npm run build && npm run test`
