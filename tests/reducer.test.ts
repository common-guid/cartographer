import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ReducerService } from '../src/services/graph/reducer-service.js';

describe('ReducerService', () => {
  const testDir = path.resolve('tests/mock-output');
  const reducer = new ReducerService();

  beforeAll(async () => {
    // Set up mock directory
    await fs.mkdir(testDir, { recursive: true });

    // File 1: src/main.js
    const mainJs = 'import { helper } from "./helper.js"; function init() { helper(); }';
    const mainMeta = {
      id: 'src/main.js',
      imports: ['./helper.js'],
      exports: [],
      definedFunctions: [
        { id: 'src/main.js:init', name: 'init', line: 1 }
      ],
      calls: [
        { from: 'src/main.js:init', to: 'helper', type: 'external' }
      ],
      apiSinks: []
    };

    // File 2: src/helper.js
    const helperJs = 'export function helper() { fetch("/api/v1/helper"); }';
    const helperMeta = {
      id: 'src/helper.js',
      imports: [],
      exports: ['helper'],
      definedFunctions: [
        { id: 'src/helper.js:helper', name: 'helper', line: 1 }
      ],
      calls: [],
      apiSinks: [
        { method: 'GET', urlPattern: 'https://api.example.com/api/v1/helper' }
      ]
    };

    // Write mock js files so enhanced-resolve can resolve them
    await fs.mkdir(path.join(testDir, 'src'), { recursive: true });
    await fs.writeFile(path.join(testDir, 'src/main.js'), mainJs, 'utf-8');
    await fs.writeFile(path.join(testDir, 'src/main.js.metadata.json'), JSON.stringify(mainMeta), 'utf-8');

    await fs.writeFile(path.join(testDir, 'src/helper.js'), helperJs, 'utf-8');
    await fs.writeFile(path.join(testDir, 'src/helper.js.metadata.json'), JSON.stringify(helperMeta), 'utf-8');
  });

  afterAll(async () => {
    // Clean up
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('should stitch together the metadata and build call/module graphs & api surface', async () => {
    await reducer.aggregateAndWrite(testDir);

    // Assert files exist
    const moduleGraphContent = await fs.readFile(path.join(testDir, 'module-graph.json'), 'utf-8');
    const callGraphContent = await fs.readFile(path.join(testDir, 'call-graph.json'), 'utf-8');
    const apiSurfaceContent = await fs.readFile(path.join(testDir, 'api-surface.json'), 'utf-8');
    const openapiContent = await fs.readFile(path.join(testDir, 'openapi.json'), 'utf-8');

    const moduleGraph = JSON.parse(moduleGraphContent);
    const callGraph = JSON.parse(callGraphContent);
    const apiSurface = JSON.parse(apiSurfaceContent);
    const openapi = JSON.parse(openapiContent);

    // 1. Module graph assertion
    expect(moduleGraph.files['src/main.js']).toBeDefined();
    // Verify enhanced-resolve successfully resolved './helper.js' relative to 'src/main.js' -> 'src/helper.js'
    expect(moduleGraph.files['src/main.js'].imports).toContain('src/helper.js');

    // 2. Call graph assertion
    expect(callGraph.nodes['src/main.js:init']).toBeDefined();
    expect(callGraph.nodes['src/helper.js:helper']).toBeDefined();

    const edge = callGraph.edges.find((e: any) => e.from === 'src/main.js:init');
    expect(edge).toBeDefined();
    expect(edge.to).toBe('src/helper.js:helper');
    expect(edge.type).toBe('external');

    // 3. API surface assertion
    expect(apiSurface.baseUrl).toBe('https://api.example.com');
    expect(apiSurface.endpoints[0].urlPattern).toBe('https://api.example.com/api/v1/helper');

    // 4. OpenAPI assertion
    expect(openapi.openapi).toBe('3.0.0');
    expect(openapi.paths['/api/v1/helper']).toBeDefined();
  });
});
