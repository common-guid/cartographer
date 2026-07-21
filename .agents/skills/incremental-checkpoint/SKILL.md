---
name: incremental-checkpoint
description: Saves incremental delta summaries of the conversation to a local .checkpoints directory without re-summarizing previous context.
---

# Incremental Checkpoint Skill

This skill allows the agent to save delta summaries of the conversation to `.checkpoints/checkpoint_<timestamp>.md`.

## Incremental Checkpoint Protocol

If the user types "checkpoint" (or requests to save a checkpoint), you must immediately execute the following steps:
1. Scan your conversation history for the exact phrase: `[=== CHECKPOINT_MARKER ===]`.
2. **If the marker is found:** Generate a comprehensive summary of ONLY the conversation that has occurred *since the most recent marker*. Do not summarize anything before it.
3. **If the marker is NOT found:** Generate a comprehensive summary of the entire conversation from the very beginning.
4. Call the `save_checkpoint` tool (in `checkpoint_tool.py`), passing your generated summary as the argument.
5. Output the exact return string provided by the tool to the user so the `[=== CHECKPOINT_MARKER ===]` becomes part of the active chat history context.
