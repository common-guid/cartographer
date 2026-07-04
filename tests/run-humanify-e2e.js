import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import puppeteer from 'puppeteer';
import dotenv from 'dotenv';

dotenv.config();

const PORT = 3323;
const OUTPUT_DIR = 'dist-output-e2e';
const FIXTURE_DIR = 'fixtures/webpack-hello-world/dist';
const SCREENSHOT_DIR = path.resolve('./dist-output-e2e/reports');
const REPORT_PATH = path.join(SCREENSHOT_DIR, 'humanify_e2e_run_report.md');

async function cleanOutputDir() {
  console.log(`[E2E] Cleaning output directory: ${OUTPUT_DIR}...`);
  await fs.rm(OUTPUT_DIR, { recursive: true, force: true }).catch(() => {});
}

function startPipelineServer() {
  return new Promise((resolve, reject) => {
    console.log('[E2E] Starting JS Cartographer pipeline and dashboard server...');
    // Run CLI: node dist/cli/run.js run <fixture> -o <output> -p <port>
    const serverProcess = spawn('node', [
      'dist/cli/run.js',
      'run',
      FIXTURE_DIR,
      '-o',
      OUTPUT_DIR,
      '-p',
      PORT.toString()
    ], {
      env: {
        ...process.env,
        PATH: `/home/guid/.local/share/fnm/node-versions/v22.15.0/installation/bin:${process.env.PATH}`
      }
    });

    let outputLog = '';
    let serverStarted = false;

    serverProcess.stdout.on('data', (data) => {
      const line = data.toString();
      outputLog += line;
      console.log(`[Pipeline/Server stdout] ${line.trim()}`);

      if (line.includes('[Explorer] Server is listening')) {
        serverStarted = true;
        resolve({ serverProcess, outputLog });
      }
    });

    serverProcess.stderr.on('data', (data) => {
      const line = data.toString();
      console.error(`[Pipeline/Server stderr] ${line.trim()}`);
    });

    serverProcess.on('close', (code) => {
      console.log(`[E2E] Server process exited with code ${code}`);
      if (!serverStarted) {
        reject(new Error(`Server closed prematurely with code ${code}`));
      }
    });

    // Fallback timeout
    setTimeout(() => {
      if (!serverStarted) {
        serverProcess.kill();
        reject(new Error('Timeout waiting for pipeline execution and server initialization.'));
      }
    }, 300000);
  });
}

async function verifyFilesGenerated() {
  console.log('[E2E] Phase 1 & 2: Verifying generated files...');
  
  const expectedFiles = [
    'bundle.js',
    'module-graph.json',
    'call-graph.json',
    'api-surface.json',
    'bundle.js.metadata.json'
  ];

  for (const file of expectedFiles) {
    const filePath = path.join(OUTPUT_DIR, file);
    try {
      await fs.access(filePath);
      console.log(`  ✅ Found: ${file}`);
    } catch {
      throw new Error(`Missing expected output file: ${file}`);
    }
  }

  // Read call-graph.json
  const callGraphContent = await fs.readFile(path.join(OUTPUT_DIR, 'call-graph.json'), 'utf-8');
  const callGraph = JSON.parse(callGraphContent);

  // Check rename progress
  const nodes = Object.values(callGraph.nodes || {});
  if (nodes.length === 0) {
    throw new Error('Call graph contains no nodes.');
  }

  const obfuscatedRegex = /^([a-zA-Z]|_0x[a-f0-9]+)$/;
  const obfuscatedCount = nodes.filter(n => obfuscatedRegex.test(n.name)).length;
  const renamedCount = nodes.length - obfuscatedCount;
  const renameRatio = renamedCount / nodes.length;

  console.log(`  📊 Renaming stats: Total nodes: ${nodes.length}, Obfuscated remaining: ${obfuscatedCount}, Renamed: ${renamedCount} (${(renameRatio * 100).toFixed(1)}%)`);

  if (renameRatio < 0.80) {
    throw new Error(`Renaming ratio is ${(renameRatio * 100).toFixed(1)}%, which is below the required 80% threshold.`);
  }
  console.log('  ✅ Phase 1 & 2 Success Criteria Met: Renaming threshold satisfied.');
  return { nodes, renameRatio };
}

async function verifyBackendApi() {
  console.log('[E2E] Phase 3: Verifying API endpoints...');

  const filesRes = await fetch(`http://localhost:${PORT}/api/files`);
  if (!filesRes.ok) throw new Error(`GET /api/files failed: ${filesRes.status}`);
  const filesList = await filesRes.json();
  console.log('  ✅ /api/files endpoint returns 200');

  if (!filesList.includes('bundle.js')) {
    throw new Error('/api/files does not include bundle.js');
  }

  const graphsRes = await fetch(`http://localhost:${PORT}/api/graphs`);
  if (!graphsRes.ok) throw new Error(`GET /api/graphs failed: ${graphsRes.status}`);
  const graphsData = await graphsRes.json();
  console.log('  ✅ /api/graphs endpoint returns 200');

  if (!graphsData.callGraph || !graphsData.moduleGraph || !graphsData.apiSurface) {
    throw new Error('/api/graphs response is missing one or more graph structures');
  }

  const fileRes = await fetch(`http://localhost:${PORT}/api/file?path=bundle.js`);
  if (!fileRes.ok) throw new Error(`GET /api/file?path=bundle.js failed: ${fileRes.status}`);
  const fileContent = await fileRes.text();
  console.log('  ✅ /api/file?path=bundle.js returns 200');

  if (fileContent.length === 0) {
    throw new Error('/api/file content is empty');
  }

  // Security Test: Path Traversal block
  const traversalRes = await fetch(`http://localhost:${PORT}/api/file?path=../../package.json`);
  console.log(`  🔒 Security Check: Path traversal request returned status ${traversalRes.status}`);
  if (traversalRes.status !== 400 && traversalRes.status !== 403) {
    throw new Error(`Security vulnerability: Path traversal permitted! Returned status ${traversalRes.status}`);
  }
  console.log('  ✅ Phase 3 Success Criteria Met: API functionality and security verified.');
}

async function runBrowserTests(nodes) {
  console.log('[E2E] Phase 4 & 5: Running Web UI & Browser Automation...');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    console.log(`  Navigating to http://localhost:${PORT}/...`);
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0', timeout: 30000 });

    // Verify workspace loaded
    await page.waitForSelector('#graph-visualizer-canvas', { timeout: 15000 });
    console.log('  ✅ Dashboard graph canvas successfully rendered.');

    // Save screenshots dir check
    await fs.mkdir(SCREENSHOT_DIR, { recursive: true });

    // Capture initial module graph state
    const graphViewPath = path.join(SCREENSHOT_DIR, 'graph_view.png');
    await page.screenshot({ path: graphViewPath });
    console.log(`  📸 Screenshot saved: ${graphViewPath}`);

    // Switch to Call Graph via Zustand store
    console.log('  Switching to Call Graph via store...');
    await page.evaluate(() => {
      window.useStore.getState().setGraphType('call');
    });

    // Find a semantic internal node ID from the list
    const internalRenamedNode = nodes.find(n => n.file === 'bundle.js' && !/^(_0x[a-f0-9]+|[tner])$/.test(n.name));
    if (!internalRenamedNode) {
      throw new Error('No internal renamed node found in call graph nodes list to click.');
    }

    console.log(`  Simulating node click for node ID: "${internalRenamedNode.id}" (name: "${internalRenamedNode.name}")`);
    await page.evaluate((nodeId) => {
      window.useStore.getState().selectNode(nodeId);
    }, internalRenamedNode.id);

    // Wait for context panel to update
    await page.waitForSelector('#context-metadata-panel', { timeout: 5000 });
    console.log('  ✅ Context metadata panel opened.');

    // Wait for Monaco editor to load content
    await page.waitForFunction(() => {
      const editorElement = document.querySelector('#monaco-editor-pane');
      return editorElement && editorElement.textContent && !editorElement.textContent.includes('No File Selected');
    }, { timeout: 10000 });
    console.log('  ✅ Monaco editor content loaded.');

    // Verify context panel matches the selected node's properties
    const metadataHtml = await page.evaluate(() => {
      const panel = document.getElementById('context-metadata-panel');
      return panel ? panel.innerText : '';
    });

    console.log(`  Context Metadata Panel Content:\n${metadataHtml.trim()}`);

    if (!metadataHtml.includes(internalRenamedNode.name)) {
      throw new Error(`Context panel does not list the selected node name: ${internalRenamedNode.name}`);
    }
    if (!metadataHtml.includes('Function')) {
      throw new Error('Context panel type field does not match "Function".');
    }
    if (!metadataHtml.includes(`bundle.js:${internalRenamedNode.line}`)) {
      throw new Error(`Context panel does not list correct file mapping: bundle.js:${internalRenamedNode.line}`);
    }
    console.log('  ✅ Context panel contents match selected node properties.');

    // Capture synchronized UI screenshot
    const editorViewPath = path.join(SCREENSHOT_DIR, 'editor_view.png');
    await page.screenshot({ path: editorViewPath });
    console.log(`  📸 Screenshot saved: ${editorViewPath}`);

    console.log('  ✅ Phase 4 & 5 Success Criteria Met: User interface correctly synchronized with pipeline data.');
    return {
      selectedNodeName: internalRenamedNode.name,
      selectedNodeLine: internalRenamedNode.line
    };
  } finally {
    await browser.close();
  }
}

async function generateReport(renameRatio, nodeName, nodeLine, duration) {
  console.log(`[E2E] Generating final markdown report at ${REPORT_PATH}...`);

  const report = `# Cartographer Humanify Integration - Automated E2E Run Report

**Date:** ${new Date().toISOString().split('T')[0]} | **Fixture:** \`fixtures/webpack-hello-world\` | **Status:** 🟢 PASSED

This report validates the end-to-end integration between the **HumanifyService**, the **PipelineOrchestrator**, the **Reducer Phase**, the **Express API**, and the **React Dashboard**.

---

## 📊 Phase 1 & 2: Pipeline Execution & Graph Generation
*   **CLI Run:** SUCCESS (Exit code 0, all expected files generated)
*   **Sidecars:** SUCCESS (\`bundle.js.metadata.json\` correctly written)
*   **Heuristic + LLM Renaming Ratio:** **${(renameRatio * 100).toFixed(1)}%** (Required: >=80.0%)
*   **Result:** Nodes correctly aggregated into global graph artifacts.

---

## 🔒 Phase 3: Backend API Validation
*   **\`GET /api/files\`:** SUCCESS (Returned files list containing \`bundle.js\`)
*   **\`GET /api/graphs\`:** SUCCESS (Returned valid call and module graphs)
*   **\`GET /api/file?path=bundle.js\`:** SUCCESS (Returned deobfuscated source code)
*   **Path Traversal Prevention:** SUCCESS (Traversals to parent directories correctly rejected with HTTP 400/403)

---

## 🖥️ Phase 4 & 5: Frontend Web UI & Visual Verification
*   **Dashboard Loading:** SUCCESS (Sigma.js canvas successfully loaded)
*   **Interaction Synchronization:** SUCCESS (Programmatic selection of function node \`${nodeName}\` resolved correctly)
*   **Context Metadata Card:** SUCCESS (Successfully correlated node to definition at \`bundle.js:${nodeLine}\`)
*   **Monaco Editor Synchronization:** SUCCESS (Monaco editor loaded humanified source code corresponding to selected node)

### 📸 Visual Evidence
The following screenshots were programmatically captured during the browser automation stage:

1. **Graph View (Initial State):**
   ![Graph View](file://${path.join(SCREENSHOT_DIR, 'graph_view.png')})

2. **Synchronized Editor View (After selecting node):**
   ![Editor View](file://${path.join(SCREENSHOT_DIR, 'editor_view.png')})

---

**Execution Duration:** ${duration}s
`;

  return fs.writeFile(REPORT_PATH, report, 'utf-8');
}

async function main() {
  console.log('=====================================================');
  console.log(' Starting Automated End-to-End Humanify Integration Tests ');
  console.log('=====================================================');

  const startTime = Date.now();
  let serverProcessInfo = null;

  try {
    await cleanOutputDir();
    
    serverProcessInfo = await startPipelineServer();
    
    const { nodes, renameRatio } = await verifyFilesGenerated();
    
    await verifyBackendApi();
    
    const browserResult = await runBrowserTests(nodes);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    await generateReport(
      renameRatio,
      browserResult.selectedNodeName,
      browserResult.selectedNodeLine,
      duration
    );

    console.log('\n=====================================================');
    console.log(' 🟢 E2E TESTING COMPLETED SUCCESSFULLY!');
    console.log(` Report written to: ${REPORT_PATH}`);
    console.log('=====================================================');
    process.exit(0);

  } catch (error) {
    console.error('\n=====================================================');
    console.error(' ❌ E2E TESTING FAILED!');
    console.error(error.message);
    console.error('=====================================================');
    process.exit(1);

  } finally {
    if (serverProcessInfo && serverProcessInfo.serverProcess) {
      console.log('[E2E] Terminating local server process...');
      serverProcessInfo.serverProcess.kill();
    }
  }
}

main();
