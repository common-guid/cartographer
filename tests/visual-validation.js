import puppeteer from 'puppeteer';
import { execSync } from 'child_process';
import path from 'path';

async function run() {
  console.log('Starting visual validation test...');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    console.log('Navigating to http://localhost:3005/...');
    await page.goto('http://localhost:3005/', { waitUntil: 'networkidle0', timeout: 30000 });
    
    console.log('Waiting for graph canvas element #graph-visualizer-canvas...');
    await page.waitForSelector('#graph-visualizer-canvas', { timeout: 15000 });

    console.log('Switching to Call Graph view...');
    const buttons = await page.$$('#graph-type-toggle button');
    if (buttons.length > 1) {
      await buttons[1].click();
    }
    
    // Wait for Sigma.js layout to settle
    console.log('Waiting 5 seconds for Call Graph layout to render...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const screenshotPath = path.resolve('screenshot.png');
    console.log(`Taking screenshot: ${screenshotPath}`);
    await page.screenshot({ path: screenshotPath });
    
    console.log('Verifying screenshot via Antigravity CLI...');
    const prompt = 'Look at the image file screenshot.png in the workspace root. Confirm if there is a network graph (a set of nodes or circles connected by lines/edges) visible in this image. Answer with just YES or NO.';
    
    const command = `agy --dangerously-skip-permissions --print "${prompt}"`;
    console.log(`Running: ${command}`);
    const result = execSync(command, { encoding: 'utf-8' });
    console.log('Antigravity CLI Response:', result.trim());
    
    if (result.toUpperCase().includes('YES')) {
      console.log('✅ Visual Validation Passed: Network graph is visible.');
      process.exit(0);
    } else {
      console.error('❌ Visual Validation Failed: Network graph was not detected in the screenshot.');
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Error during visual validation:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
