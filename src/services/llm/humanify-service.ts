import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

export class HumanifyService {
  private binaryPath: string;

  constructor() {
    // Determine path to local humanify binary
    const isWindows = process.platform === 'win32';
    const localPath = path.join(process.cwd(), 'bin', isWindows ? 'humanify.exe' : 'humanify');
    
    if (fs.existsSync(localPath)) {
      this.binaryPath = localPath;
    } else {
      // Fallback to system PATH
      this.binaryPath = isWindows ? 'humanify.exe' : 'humanify';
    }
  }

  async rename(code: string): Promise<string> {
    const provider = this.getProvider();
    const model = process.env.LLM_MODEL;

    const args: string[] = [provider];
    
    if (model) {
      args.push('-m', model);
    }
    
    // Read input from stdin, write to stdout
    args.push('-');

    console.log(`[HumanifyService] Running: ${this.binaryPath} ${args.join(' ')}`);

    return new Promise((resolve, reject) => {
      const child = spawn(this.binaryPath, args, {
        env: {
          ...process.env,
        },
      });

      let stdoutData = '';
      let stderrData = '';

      child.stdout.on('data', (chunk) => {
        stdoutData += chunk.toString();
      });

      child.stderr.on('data', (chunk) => {
        stderrData += chunk.toString();
      });

      child.on('close', (exitCode) => {
        if (exitCode !== 0) {
          console.warn(`[HumanifyService] Process exited with code ${exitCode}. Error:\n${stderrData}`);
          // Fallback to original code rather than crashing
          resolve(code);
          return;
        }

        resolve(stdoutData);
      });

      child.on('error', (err) => {
        console.error('[HumanifyService] Failed to start humanify process:', err);
        // Fallback to original code
        resolve(code);
      });

      // Write code to stdin and close it to signal EOF to humanify
      child.stdin.write(code);
      child.stdin.end();
    });
  }

  private getProvider(): string {
    const envProvider = (process.env.LLM_PROVIDER || 'gemini').toLowerCase();
    
    // Normalize provider name for humanify binary
    switch (envProvider) {
      case 'gemini':
      case 'openai':
      case 'openrouter':
      case 'ollama':
      case 'anthropic':
        return envProvider;
      case 'local':
        return 'ollama';
      default:
        console.warn(`[HumanifyService] Unknown provider "${envProvider}". Defaulting to "gemini".`);
        return 'gemini';
    }
  }
}
