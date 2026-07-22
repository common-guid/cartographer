# Agents Guide for JS Cartographer

Welcome! This file provides essential guidelines, context, and operational protocols for AI agents working on this project.

## 🚨 Mandatory Operational Protocols

### 1. Dev Logbook Logging
The project uses the `dev-logbook` skill to maintain a history of all codebase changes in [LOGBOOK.md](file:///home/guid/projects/cartographer/cartographer/LOGBOOK.md).

- **Rule:** You **MUST** run the logbook update script after **every** codebase modification turn (adding, editing, or deleting files).
- **Command:**
  ```bash
  bash .agents/skills/dev-logbook/scripts/log.sh "<Title of the Change>" "<Brief summary of why and what was changed>"
  ```
- **Constraint:** Do not wait for the user to ask you to log. This is a mandatory, automated step.

### 2. Plan Verification & Screenshots
- **Rule:** Whenever developing an implementation plan, verification plan, or any plan that requires some form of testing/verification, you **MUST** (wherever possible) include explicit instructions to capture and record screenshots of the results (e.g. using Puppeteer, browser dev tools, or CLI utilities) for visual review.

---


## 🚂 Conductor Integration & Workflow

We use the **Conductor** methodology to organize features, specify requirements, and coordinate work. All agents working on this project **must** adhere to the Conductor protocols.

### 🧭 Conductor Directory Map
* **[Conductor Index](file:///home/guid/projects/cartographer/cartographer/conductor/index.md):** The entry point mapping all Conductor artifacts.
* **[Product Guide](file:///home/guid/projects/cartographer/cartographer/conductor/product.md):** Vision, features, and core concept.
* **[Product Guidelines](file:///home/guid/projects/cartographer/cartographer/conductor/product-guidelines.md):** Coding quality guidelines, LLM safety constraints, and CLI principles.
* **[Technology Stack](file:///home/guid/projects/cartographer/cartographer/conductor/tech-stack.md):** Official compiler, parser, and runtime specifications.
* **[Project Workflow](file:///home/guid/projects/cartographer/cartographer/conductor/workflow.md):** The step-by-step TDD, git commit, git notes, and verification protocol.

### 📋 Key Agent Rules for Conductor
1. **Plan as Source of Truth:** Never implement tasks that are not defined in the active track's `plan.md` (located in `conductor/tracks/<track_id>/`).
2. **Strict Task Lifecycle:**
   - Mark a task in progress (`[~]`) in `plan.md` before coding.
   - Follow Test-Driven Development (TDD) (Red Phase -> Green Phase -> Refactor).
   - Commit code with structured messages (e.g. `feat(scope): desc`).
   - Attach commit notes with details of the task using `git notes`.
   - Update task status in `plan.md` to `[x]` and record the 7-character commit SHA.
3. **Phase Checkpoints:** Upon completing tasks that close a phase in `plan.md`, execute the Verification and Checkpointing Protocol (run tests, manual validation plan, wait for confirmation, create checkpoint commit with auditable notes).

---

## Planning

**Rule:** Whenever creating an implementation plan, or drafting an artifact for a feature always use the following template for the plan.
```markdown
## 1. Objective
## 2. Prerequisites
## 3. Scope & Boundaries
### In Scope
### Out of Scope
## 4. Architecture & Design
### Component Diagram
### Key Design Decisions
## 5. Implementation Steps
## 6. File Manifest
## 7. Testing Requirements
### Existing Tests
### New Tests
### Eval Gate
## 8. Observability & Telemetry
## 9. Rollback Plan
## 10. Definition of Done
## 11. Security Considerations
## 12. References
```