import puppeteer from 'puppeteer';
import path from 'path';
import { startServer } from '../dist/explorer/server.js';

async function run() {
  const outputDir = path.resolve('test-output-4');
  const port = 3009;
  console.log(`Starting Explorer server for ${outputDir} on port ${port}...`);
  const server = startServer(outputDir, port);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    console.log(`Navigating to http://localhost:${port}/...`);
    await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle0', timeout: 30000 });

    console.log('Waiting for graph canvas element #graph-visualizer-canvas...');
    await page.waitForSelector('#graph-visualizer-canvas', { timeout: 15000 });

    console.log('Switching to Call Graph view...');
    const buttons = await page.$$('#graph-type-toggle button');
    if (buttons.length > 1) {
      await buttons[1].click();
    }

    console.log('Waiting for Call Graph layout to render...');
    await new Promise(resolve => setTimeout(resolve, 4000));

    const screenshotPath = path.resolve('call-graph-test-output-4.png');
    console.log(`Taking screenshot: ${screenshotPath}`);
    await page.screenshot({ path: screenshotPath });

    console.log('✅ Screenshot test completed successfully!');
  } catch (err) {
    console.error('❌ Error during visual screenshot test:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
    server.close();
    process.exit(process.exitCode || 0);
  }
}

run();
