import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import http from 'node:http';

class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens = 5;
  private readonly refillRate = 5 / 60000; // tokens per ms

  constructor() {
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    while (true) {
      const now = Date.now();
      const elapsed = now - this.lastRefill;
      this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
      this.lastRefill = now;

      if (this.tokens >= 1) {
        this.tokens -= 1;
        return;
      }
      
      const waitTime = Math.ceil((1 - this.tokens) / this.refillRate);
      await new Promise(r => setTimeout(r, waitTime));
    }
  }
}

const globalRateLimiter = new RateLimiter();

async function runAgyPrint(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('agy', ['-p', prompt], {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => stdout += d.toString());
    child.stderr.on('data', (d) => stderr += d.toString());
    
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`agy failed with code ${code}: ${stderr}`));
      } else {
        resolve(stdout.trim());
      }
    });
    child.on('error', reject);
  });
}

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

    let proxyServer: http.Server | null = null;
    let actualProvider = provider;
    let env = { ...process.env };

    if (provider === 'agy') {
      actualProvider = 'ollama';
      proxyServer = http.createServer((req, res) => {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', async () => {
          try {
            const data = JSON.parse(body);
            let prompt = '';
            
            if (data.prompt) {
              prompt = data.prompt;
            } else if (data.messages && Array.isArray(data.messages)) {
              // Combine messages into a single prompt for agy
              prompt = data.messages.map((m: any) => `${m.role}:\n${m.content}`).join('\n\n');
            }

            const estimatedTokens = Math.ceil(prompt.length / 4);
            if (estimatedTokens > 10000) {
              console.warn(`[AgyProxy] Warning: Prompt size (${prompt.length} chars, ~${estimatedTokens} tokens) exceeds 10,000 tokens limit.`);
            }

            console.log(`[AgyProxy] Routing prompt to agy CLI...`);
            await globalRateLimiter.acquire();
            const agyResponse = await runAgyPrint(prompt);
            
            // Ollama expects JSON lines (ndjson) if streaming, or a single JSON if stream=false
            // We'll just return a single chunk with done=true which works for both.
            const isChat = req.url?.includes('/api/chat');
            
            const responseObj = isChat 
              ? {
                  model: data.model || "agy",
                  message: { role: "assistant", content: agyResponse },
                  done: true
                }
              : {
                  model: data.model || "agy",
                  response: agyResponse,
                  done: true
                };

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(responseObj) + '\n');
          } catch (err: any) {
            console.error('[AgyProxy] Error:', err);
            res.writeHead(500);
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      });

      await new Promise<void>((resolve, reject) => {
        // Try standard Ollama port first
        proxyServer!.listen(11434, '127.0.0.1', () => {
          resolve();
        });
        proxyServer!.on('error', (err: any) => {
          if (err.code === 'EADDRINUSE') {
            console.warn('[AgyProxy] Port 11434 in use, letting OS pick random port...');
            // Fallback to random port
            proxyServer!.listen(0, '127.0.0.1', () => resolve());
          } else {
            reject(err);
          }
        });
      });

      const port = (proxyServer.address() as any).port;
      console.log(`[AgyProxy] Listening on http://127.0.0.1:${port}`);
      // Some clients use OLLAMA_HOST, others might use OLLAMA_API_BASE
      env.OLLAMA_HOST = `127.0.0.1:${port}`;
      env.OLLAMA_API_BASE = `http://127.0.0.1:${port}`;
    }

    const args: string[] = [actualProvider];
    
    if (model && provider !== 'agy') {
      args.push('-m', model);
    } else if (provider === 'agy') {
      // Provide a dummy model name for Ollama to be happy
      args.push('-m', model || 'agy');
    }

    args.push('--context-size', '2000');
    
    // Read input from stdin, write to stdout
    args.push('-');

    console.log(`[HumanifyService] Running: ${this.binaryPath} ${args.join(' ')}`);

    return new Promise((resolve, reject) => {
      const child = spawn(this.binaryPath, args, {
        env,
      });

      let stdoutData = '';
      let stderrData = '';

      child.stdout.on('data', (chunk) => {
        stdoutData += chunk.toString();
      });

      child.stderr.on('data', (chunk) => {
        stderrData += chunk.toString();
      });

      const cleanup = () => {
        if (proxyServer) {
          proxyServer.close();
        }
      };

      child.on('close', (exitCode) => {
        cleanup();
        if (exitCode !== 0) {
          console.warn(`[HumanifyService] Process exited with code ${exitCode}. Error:\n${stderrData}`);
          // Fallback to original code rather than crashing
          resolve(code);
          return;
        }

        resolve(stdoutData);
      });

      child.on('error', (err) => {
        cleanup();
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
      case 'agy':
        return envProvider;
      case 'local':
        return 'ollama';
      default:
        console.warn(`[HumanifyService] Unknown provider "${envProvider}". Defaulting to "gemini".`);
        return 'gemini';
    }
  }
}
