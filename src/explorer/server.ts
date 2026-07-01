import express from 'express';
import cors from 'cors';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

  const clientDir = path.resolve(__dirname, 'client');
  app.use(express.static(clientDir));
  app.get(/.*/, (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(clientDir, 'index.html'));
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
