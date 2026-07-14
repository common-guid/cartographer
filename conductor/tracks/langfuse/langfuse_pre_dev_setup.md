# Pre-Development Review: Langfuse Integration Setup & Testing

This document outlines the required pre-development configuration and verification setup prior to handoff to Google's Jules coding agent for Langfuse instrumentation.

---

## 1. Pre-Development Configurations (Langfuse Cloud)

Since you already have an active Langfuse Cloud account, perform these steps inside your Langfuse dashboard before starting development:

1. **Create a Dedicated Project:** Create a project named `JS-Cartographer` (or `Cartographer-Dev`).
2. **Generate API Credentials:** Go to **Project Settings** > **API Credentials** and retrieve:
   * **`Public Key`** (`pk-lf-...`)
   * **`Secret Key`** (`sk-lf-...`)
   * **`Host / Base URL`** (e.g., `https://cloud.langfuse.com` or region-specific like `https://us.cloud.langfuse.com`).
3. **Local `.env` Configuration:** Add these credentials to your local `.env` file:
   ```env
   LANGFUSE_ENABLED=true
   LANGFUSE_PUBLIC_KEY=your_public_key_here
   LANGFUSE_SECRET_KEY=your_secret_key_here
   LANGFUSE_BASE_URL=https://cloud.langfuse.com
   ```
   *(Ensure these are also added to `.env.example` as placeholders).*

---

## 2. Testing & Verification Strategy for Jules

To ensure Jules can execute and verify the implementation autonomously and safely without manual UI verification, the following methods are available:

### Method A: Verification via the Langfuse CLI (`langfuse-cli`)
Jules can run commands directly from the terminal to query live trace databases and confirm trace uploads are successful.

* **List Traces:**
  ```bash
  npx langfuse-cli api traces list --limit 5
  ```
  *Verifies that `cartographer_run` traces are arriving in Langfuse.*
* **Get Trace Details:**
  ```bash
  npx langfuse-cli api traces get <trace_id>
  ```
  *Verifies the nested spans (`sanitize`, `boilerplate_classify`) and the LLM `llm_rename` generation data.*
* **Checking schema and resources:**
  ```bash
  npx langfuse-cli api __schema
  ```

### Method B: Vitest Mock Verification (Offline Unit Tests)
Jules should write unit/integration tests (using Vitest) that mock the Langfuse SDK so that pipeline execution does not depend on live network connections during CI/CD test runs:
* Use Vitest spies to assert that `langfuse.trace()` and `trace.generation()` are called with the correct parameters (e.g. model, input code length).

---

## 3. Agent Capabilities & Developer Tooling

To accelerate Jules' productivity and context alignment:

### 1. Langfuse Docs MCP Server
Jules can be configured to use the official Langfuse Model Context Protocol (MCP) server. This gives the agent direct, semantic lookup capabilities to Langfuse's entire documentation base, helping it troubleshoot SDK version quirks (such as differences between manual tracing and OTel tracing).
* **Endpoint:** `https://langfuse.com/api/mcp`
* **Transport:** `streamableHttp`

### 2. Langfuse Skill for AI Coding Agents
If supported in the workspace plugin configurations, you can equip the agent workspace with the Langfuse agent skill. This provides specialized templates and instructions for setting up prompt management, datasets, and score assessments programmatically.
* **Skill Reference:** [langfuse-skills](https://github.com/langfuse/skills/tree/main/skills/langfuse)
