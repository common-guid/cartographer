import { execSync } from 'node:child_process';

function runCliCommand(command) {
  try {
    const output = execSync(command, { encoding: 'utf-8', env: process.env });
    return JSON.parse(output);
  } catch (err) {
    console.error(`Failed executing: ${command}`, err.stderr || err.message);
    process.exit(1);
  }
}

console.log('Fetching recent traces from Langfuse...');
// Ensure we fetch metadata/io fields
const tracesResponse = runCliCommand('npx langfuse-cli api traces list --limit 100 --fields "core,io" --json');
const traces = tracesResponse.body?.data || tracesResponse.data || tracesResponse;

const cartographerTrace = traces.find(t => t.name === 'cartographer_run');
if (!cartographerTrace) {
  console.error('❌ Fail: Could not find any trace with name "cartographer_run" in the last 100 traces.');
  process.exit(1);
}

const traceId = cartographerTrace.id;
console.log(`✅ Success: Found trace "cartographer_run" with ID: ${traceId}`);

console.log(`Fetching observations for trace: ${traceId}...`);
// Query all field groups to fully inspect the telemetry details
const obsResponse = runCliCommand(`npx langfuse-cli api observations list --trace-id "${traceId}" --fields "core,basic,io,usage,model,metadata" --json`);
const observations = obsResponse.body?.data || obsResponse.data || obsResponse;

console.log(`Analyzing ${observations.length} observations...`);

// 1. Verify Spans Existence
const expectedSpans = ['sanitize', 'boilerplate_classify', 'app_code_extract', 'ast_extract', 'write_output'];
for (const spanName of expectedSpans) {
  const span = observations.find(o => o.name === spanName);
  if (!span) {
    console.error(`❌ Fail: Missing expected span: "${spanName}"`);
    process.exit(1);
  }
  console.log(`  - Found span: "${spanName}"`);
}

// 2. Verify Hierarchical Nesting (Parent-Child relationships)
const processFileSpan = observations.find(o => o.name === 'process_file');
if (!processFileSpan) {
  console.error('❌ Fail: Root file processing span "process_file" not found.');
  process.exit(1);
}

const nestedSpans = ['sanitize', 'boilerplate_classify', 'app_code_extract', 'llm_rename'];
for (const spanName of nestedSpans) {
  const child = observations.find(o => o.name === spanName);
  if (child && child.parentObservationId !== processFileSpan.id) {
    console.error(`❌ Fail: Nesting violation! "${spanName}" (parent: ${child.parentObservationId}) is not nested under "process_file" (${processFileSpan.id})`);
    process.exit(1);
  }
}
console.log('✅ Success: Nested span hierarchy is correctly resolved (AsyncLocalStorage verified).');

// 3. Verify LLM Generation parameters and token usage
const generation = observations.find(o => o.name === 'llm_rename');
if (!generation) {
  console.error('❌ Fail: LLM Generation named "llm_rename" not found.');
  process.exit(1);
}

if (generation.type !== 'GENERATION') {
  console.error(`❌ Fail: "llm_rename" is not marked as GENERATION type. Found: ${generation.type}`);
  process.exit(1);
}

console.log('Validating Generation schema...');
console.log(`  - Model:  "${generation.providedModelName || generation.model}"`);
console.log(`  - Tokens: Input=${generation.inputTokens || generation.usageDetails?.input}, Output=${generation.outputTokens || generation.usageDetails?.output}`);

if (!generation.input || generation.input.trim() === '') {
  console.error('❌ Fail: Generation prompt input is empty.');
  process.exit(1);
}

if (!generation.output || generation.output.trim() === '') {
  console.error('❌ Fail: Generation response output is empty.');
  process.exit(1);
}

const inputTokens = generation.inputTokens || generation.usageDetails?.input;
const outputTokens = generation.outputTokens || generation.usageDetails?.output;
if (!inputTokens || !outputTokens || inputTokens <= 0 || outputTokens <= 0) {
  console.error('❌ Fail: Invalid token usage numbers in Generation.');
  process.exit(1);
}

console.log('✅ Success: Observability verification passed successfully!');
process.exit(0);
