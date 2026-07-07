# Agents Guide for JS Cartographer

Welcome! This file provides essential guidelines, context, and operational protocols for AI agents working on this project.

## 🛠️ Project Overview & Tech Stack

**JS Cartographer** is an AI-powered JavaScript deobfuscator, code humanizer, and semantic mapper. It reconstructs minified, obfuscated, or bundled JavaScript into readable source files, build module call graphs, and export OpenAPI specs.

- **Language:** TypeScript (strict mode, target ESM)
- **Tooling:** Node.js v18+, npm
- **Core Libraries:** Babel (`@babel/core`, `@babel/parser`, `@babel/traverse`, `@babel/generator`), Wakaru (`@wakaru/unminify`), Express, Puppeteer
- **Testing:** Vitest

## 📂 Project Structure

- `src/`: Core TypeScript source files.
- `tests/`: Test suites (Vitest).
- `scripts/`: Utility scripts.
- `.agents/`: Directory containing agent-specific files and custom skills.
- `LOGBOOK.md`: The official log of all changes made to the codebase.

## ⚙️ Key Commands

- **Build Project:** `npm run build`
- **Run Tests:** `npm run test`
- **Run CLI:** `node dist/cli/run.js`

---

## 🚨 Mandatory Operational Protocols

### 1. Dev Logbook Logging
The project uses the `dev-logbook` skill to maintain a history of all codebase changes in [LOGBOOK.md](file:///home/guid/projects/cartographer/cartographer/LOGBOOK.md).

- **Rule:** You **MUST** run the logbook update script after **every** codebase modification turn (adding, editing, or deleting files).
- **Command:**
  ```bash
  bash .agents/skills/dev-logbook/scripts/log.sh "<Title of the Change>" "<Brief summary of why and what was changed>"
  ```
- **Constraint:** Do not wait for the user to ask you to log. This is a mandatory, automated step.
