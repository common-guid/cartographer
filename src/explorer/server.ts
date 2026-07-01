import express from 'express';
import cors from 'cors';
import fs from 'node:fs/promises';
import path from 'node:path';

export function startServer(outputDir: string, port = 3000) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  function isPathSafe(targetPath: string): boolean {
    const resolvedTarget = path.resolve(outputDir, targetPath);
    return resolvedTarget.startsWith(path.resolve(outputDir));
  }

  app.get('/api/files', async (req, res) => {
    try {
      const filesList = await getFilesRecursive(outputDir);
      const relativeFiles = filesList.map(f => path.relative(outputDir, f));
      res.json(relativeFiles);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/file', async (req, res) => {
    const relativePath = req.query.path as string;
    if (!relativePath) {
       res.status(400).json({ error: 'Missing path query parameter' });
       return;
    }

    if (!isPathSafe(relativePath)) {
       res.status(403).json({ error: 'Access denied: unsafe path traversal' });
       return;
    }

    try {
      const fullPath = path.resolve(outputDir, relativePath);
      const content = await fs.readFile(fullPath, 'utf-8');
      res.send(content);
    } catch (error: any) {
      res.status(404).json({ error: `File not found: ${relativePath}` });
    }
  });

  app.get('/api/graphs', async (req, res) => {
    try {
      const moduleGraphPath = path.join(outputDir, 'module-graph.json');
      const callGraphPath = path.join(outputDir, 'call-graph.json');
      const apiSurfacePath = path.join(outputDir, 'api-surface.json');

      const moduleGraph = JSON.parse(await fs.readFile(moduleGraphPath, 'utf-8').catch(() => '{}'));
      const callGraph = JSON.parse(await fs.readFile(callGraphPath, 'utf-8').catch(() => '{}'));
      const apiSurface = JSON.parse(await fs.readFile(apiSurfacePath, 'utf-8').catch(() => '{}'));

      res.json({
        moduleGraph,
        callGraph,
        apiSurface
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>JS Cartographer Explorer</title>
        <style>
          body {
            background-color: #0b0f19;
            color: #f3f4f6;
            font-family: 'Inter', system-ui, sans-serif;
            margin: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
          }
          h1 {
            color: #38bdf8;
            font-size: 3rem;
            margin-bottom: 0.5rem;
            text-shadow: 0 0 10px rgba(56, 189, 248, 0.5);
          }
          p {
            font-size: 1.2rem;
            color: #9ca3af;
            margin-bottom: 2rem;
          }
          .card {
            background: rgba(30, 41, 59, 0.7);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 2.5rem;
            border-radius: 1rem;
            text-align: center;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
          }
          .btn {
            background: linear-gradient(135deg, #0ea5e9, #2563eb);
            color: white;
            border: none;
            padding: 0.8rem 1.8rem;
            border-radius: 0.5rem;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            transition: all 0.3s ease;
          }
          .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 15px -3px rgba(14, 165, 233, 0.4);
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>JS Cartographer</h1>
          <p>Local Explorer Server Running on Port ${port}</p>
          <a class="btn" href="/api/graphs" target="_blank">View Graph API Data</a>
        </div>
      </body>
      </html>
    `);
  });

  return app.listen(port, '0.0.0.0', () => {
    console.log(`[Explorer] Server is listening at http://0.0.0.0:${port}`);
  });
}

async function getFilesRecursive(dir: string): Promise<string[]> {
  const results: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await getFilesRecursive(fullPath)));
    } else if (entry.isFile() && !entry.name.endsWith('.metadata.json') && !entry.name.endsWith('.json')) {
      results.push(fullPath);
    }
  }

  return results;
}
