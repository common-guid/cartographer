---
name: dev-logbook
description: Record all code modifications and significant project events in the LOGBOOK.md. Use this after every implementation or bug fix to maintain project history.
---

# Dev Logbook

This skill automates the recording of project modifications to ensure the `LOGBOOK.md` remains a consistent source of truth for "why" changes were made.

## Usage

When you have completed a task or fixed a bug, run the logging script:

```bash
bash scripts/log.sh "<Title of the Change>" "<Brief summary of why and what was changed>"
```

The script will automatically:
1. Capture the current date and time.
2. Identify the active Git branch.
3. Format and append the entry to `LOGBOOK.md`.

## Mandatory Protocol

As defined in the project's `GEMINI.md`, you MUST use this skill after ANY code modification. Do not wait for user instruction to log your work.
