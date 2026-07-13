# Technology Stack - JS Cartographer

## Core Stack
* **Language:** TypeScript (strict mode, target ESM module format)
* **Runtime:** Node.js (v18.0.0+)
* **Package Manager:** npm

## Dependencies & Frameworks
* **CLI Library:** Commander (`commander` ^15.0.0) for command parsing, subcommand organization, and help generation.
* **AST Utilities:** Babel toolchain (`@babel/core`, `@babel/parser`, `@babel/traverse`, `@babel/generator` ^7.29.7) for loading, mapping, renaming, and outputting JavaScript Abstract Syntax Trees.
* **Syntax Recovery:** Wakaru (`@wakaru/unminify` ^0.2.2) to sanitize state machines, ES6 class constructs, and simplify expression statements.
* **Server Framework:** Express (`express` ^5.2.1) and CORS middleware (`cors` ^2.8.6) to power the local explorer UI backend.
* **Headless Browser:** Puppeteer (`puppeteer` ^25.2.1) for potential scraper integration or automated testing.

## Development & Tooling
* **Testing Framework:** Vitest (`vitest` ^4.1.9) for unit and integration testing.
* **Environment Configuration:** Dotenv (`dotenv` ^17.4.2) to load configurations from `.env`.
* **Path Resolution:** Enhanced Resolve (`enhanced-resolve` ^5.24.1) to resolve ESM import mapping paths cleanly.
