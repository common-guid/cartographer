# Product Guide - JS Cartographer

## Initial Concept
JS Cartographer is an AI-powered JavaScript deobfuscator, code humanizer, and semantic mapper designed to reconstruct obfuscated, minified, or bundled JavaScript code into clean, readable, and well-structured source code with associated call graphs and API specifications.

## 1. Product Vision
To provide security researchers, reverse engineers, and developers with a powerful, automated toolchain that turns opaque client-side or bundled JavaScript assets into clear, human-readable source maps, making it straightforward to analyze proprietary logic, detect malicious behaviors, and extract API endpoints.

## 2. Core Features & Capabilities
* **AST Sanitization & Unbundling:** Leverages Wakaru to clean up async/await state machines, Yoda conditions, class declarations, and sequences.
* **Smart Boilerplate Filtering:** Detects and strips standard bundler bootstrappers, transpilation helper polyfills, and framework overhead to save 60-80% on LLM tokens.
* **Context-Aware LLM Renaming:** Connects to powerful cloud APIs (Gemini, OpenRouter) and local models to replace obfuscated identifiers with contextually descriptive names.
* **Module & Call Graph Extraction:** Builds global dependencies and function-level call relationship maps.
* **API Surface Reconstruction:** Tracks network boundaries (e.g., fetch, axios calls) and automatically exports standard OpenAPI 3.0.0 specifications.
* **Interactive Local Dashboard:** Serves a high-fidelity local Express dashboard for structural visualization and code exploration.

## 3. Target Users
* **Security Engineers & Malware Analysts:** Identifying malicious code hidden in obfuscated bundles.
* **Reverse Engineers:** Analyzing closed-source APIs and proprietary client-side logic.
* **Developer Tooling Teams:** Auditing and humanizing third-party library dependencies.

## 4. Design & Experience Principles
* **Accuracy First:** Avoid introducing syntax errors during AST manipulations or LLM transformations.
* **Performance & Cost Optimization:** Minimize external API costs through proactive boilerplate pruning and rate limiting.
* **Seamless Local Execution:** Ensure the CLI and web explorer operate flawlessly on local systems.
