import puppeteer from 'puppeteer';

async function main() {
  console.log('[Capture] Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    console.log('[Capture] Navigating to http://localhost:3325/...');
    await page.goto('http://localhost:3325/', { waitUntil: 'networkidle0', timeout: 30000 });

    console.log('[Capture] Waiting for visualizer canvas...');
    await page.waitForSelector('#graph-visualizer-canvas', { timeout: 15000 });

    const screenshotPath = '/home/guid/.gemini/antigravity-cli/brain/0258b811-0eb4-419a-873d-9facab6d20e2/warp_dashboard.png';
    console.log(`[Capture] Taking screenshot: ${screenshotPath}...`);
    await page.screenshot({ path: screenshotPath });
    console.log('[Capture] Screenshot saved successfully!');

  } catch (error) {
    console.error('[Capture] Error during capture:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
