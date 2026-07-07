/**
 * The --context-size value passed to the humanify binary.
 * humanify uses this as its sliding window (in tokens) per LLM call.
 * The planner uses this to estimate tokens-per-request.
 */
export const HUMANIFY_CONTEXT_SIZE_TOKENS = 2000;
