import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { execSync } from 'node:child_process';
import os from 'node:os';

const TARGET_DIR = path.resolve('bin');
const TEMP_DIR = path.resolve('temp-download');

async function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirect
        downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: Status Code ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

async function main() {
  const platform = process.platform;
  const arch = process.arch;
  let archiveName = '';

  if (platform === 'darwin') {
    archiveName = arch === 'arm64' 
      ? 'humanify-aarch64-apple-darwin.tar.gz' 
      : 'humanify-x86_64-apple-darwin.tar.gz';
  } else if (platform === 'linux') {
    archiveName = arch === 'arm64' 
      ? 'humanify-aarch64-unknown-linux-gnu.tar.gz' 
      : 'humanify-x86_64-unknown-linux-gnu.tar.gz';
  } else if (platform === 'win32') {
    archiveName = 'humanify-x86_64-pc-windows-msvc.zip';
  } else {
    console.error(`❌ Unsupported platform: ${platform}`);
    process.exit(1);
  }

  const url = `https://github.com/jehna/humanify/releases/latest/download/${archiveName}`;
  const archivePath = path.join(TEMP_DIR, archiveName);

  console.log(`[Humanify Installer] Target directory: ${TARGET_DIR}`);
  console.log(`[Humanify Installer] Downloading: ${url}`);

  // Create directories
  fs.mkdirSync(TARGET_DIR, { recursive: true });
  fs.mkdirSync(TEMP_DIR, { recursive: true });

  try {
    await downloadFile(url, archivePath);
    console.log('[Humanify Installer] Download finished. Extracting...');

    if (archiveName.endsWith('.tar.gz')) {
      // Use system tar command to extract
      execSync(`tar -xzf "${archivePath}" -C "${TARGET_DIR}"`);
    } else if (archiveName.endsWith('.zip')) {
      // Use powershell on Windows to extract
      execSync(`powershell -Command "Expand-Archive -Path '${archivePath}' -DestinationPath '${TARGET_DIR}' -Force"`);
    }

    console.log('✅ [Humanify Installer] Humanify binary successfully installed!');
    
    // Make sure it is executable on non-Windows
    if (platform !== 'win32') {
      const binaryPath = path.join(TARGET_DIR, 'humanify');
      fs.chmodSync(binaryPath, '755');
    }
  } catch (error) {
    console.error('❌ [Humanify Installer] Installation failed:', error);
    process.exit(1);
  } finally {
    // Cleanup temp files
    try {
      fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    } catch (_) {}
  }
}

main();
