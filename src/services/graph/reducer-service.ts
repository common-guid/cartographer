import fs from 'node:fs/promises';
import path from 'node:path';
import resolve from 'enhanced-resolve';
import { FileMetadata } from './extractor-service.js';

export interface ModuleGraph {
  files: Record<string, {
    id: string;
    imports: string[];
    exports: string[];
  }>;
  entryPoint?: string;
}

export interface FunctionNode {
  id: string;
  file: string;
  name: string;
  line: number;
  isBoilerplate?: boolean;
}

export interface CallEdge {
  from: string;
  to: string;
  type: 'internal' | 'external';
  isBoilerplate?: boolean;
}

export interface CallGraphData {
  nodes: Record<string, FunctionNode>;
  edges: CallEdge[];
}

export interface ApiSurface {
  baseUrl: string;
  endpoints: {
    method: string;
    urlPattern: string;
  }[];
}

export class ReducerService {
  private resolver = resolve.create.sync({
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    conditionNames: ['node', 'import', 'require']
  });

  async aggregateAndWrite(targetDirectory: string): Promise<void> {
    console.log(`[Reducer] Aggregating metadata under: ${targetDirectory}`);

    const metadataFiles = await this.findMetadataFiles(targetDirectory);
    const fileMetadataMap = new Map<string, FileMetadata>();

    // Load all metadata files
    for (const file of metadataFiles) {
      const content = await fs.readFile(file, 'utf-8');
      const meta: FileMetadata = JSON.parse(content);
      fileMetadataMap.set(meta.id, meta); // ID is relative path, e.g., "src/auth.js"
    }

    // 1. Build module-graph.json
    const moduleGraph: ModuleGraph = { files: {} };
    
    // Track resolution: raw import string in file A -> resolved relative path
    const resolvedImportsMap = new Map<string, string>();

    for (const [id, meta] of fileMetadataMap.entries()) {
      const resolvedImports: string[] = [];
      const fileDir = path.dirname(path.join(targetDirectory, id));

      for (const rawImport of meta.imports) {
        try {
          const resolvedAbsPath = this.resolver(fileDir, rawImport);
          if (resolvedAbsPath) {
            const resolvedRelPath = path.relative(targetDirectory, resolvedAbsPath);
            resolvedImports.push(resolvedRelPath);
            resolvedImportsMap.set(`${id}:${rawImport}`, resolvedRelPath);
          }
        } catch (err) {
          // Fallback if resolve fails
          resolvedImports.push(rawImport);
          resolvedImportsMap.set(`${id}:${rawImport}`, rawImport);
        }
      }

      moduleGraph.files[id] = {
        id,
        imports: resolvedImports,
        exports: meta.exports
      };
    }

    // Detect entry point
    const importedFiles = new Set<string>();
    for (const file of Object.values(moduleGraph.files)) {
      for (const imp of file.imports) {
        importedFiles.add(imp);
      }
    }
    const possibleEntries = Object.keys(moduleGraph.files).filter(f => !importedFiles.has(f));
    if (possibleEntries.length > 0) {
      moduleGraph.entryPoint = possibleEntries[0];
    } else {
      moduleGraph.entryPoint = Object.keys(moduleGraph.files)[0];
    }

    // 2. Build call-graph.json
    const callGraph: CallGraphData = { nodes: {}, edges: [] };

    // Register all defined functions
    for (const meta of fileMetadataMap.values()) {
      for (const func of meta.definedFunctions) {
        callGraph.nodes[func.id] = {
          id: func.id,
          file: meta.id,
          name: func.name,
          line: func.line,
          isBoilerplate: func.isBoilerplate
        };
      }
    }

    // Resolve call edges
    for (const meta of fileMetadataMap.values()) {
      for (const call of meta.calls) {
        const callerId = call.from;
        const calleeRawName = call.to;

        let resolvedCalleeId = '';

        if (call.type === 'internal') {
          const targetId = `${meta.id}:${calleeRawName}`;
          if (callGraph.nodes[targetId]) {
            resolvedCalleeId = targetId;
          } else {
            resolvedCalleeId = targetId;
          }
        } else {
          // External call
          let foundTarget = false;
          for (const rawImport of meta.imports) {
            const resolvedDep = resolvedImportsMap.get(`${meta.id}:${rawImport}`);
            if (resolvedDep && fileMetadataMap.has(resolvedDep)) {
              const depMeta = fileMetadataMap.get(resolvedDep)!;
              if (depMeta.exports.includes(calleeRawName)) {
                resolvedCalleeId = `${resolvedDep}:${calleeRawName}`;
                foundTarget = true;
                break;
              }
            }
          }

          if (!foundTarget) {
            resolvedCalleeId = `external:${calleeRawName}`;
          }
        }

        callGraph.edges.push({
          from: callerId,
          to: resolvedCalleeId,
          type: call.type,
          isBoilerplate: call.isBoilerplate
        });
      }
    }

    // 3. Build api-surface.json
    const apiEndpoints: { method: string; urlPattern: string }[] = [];
    for (const meta of fileMetadataMap.values()) {
      for (const sink of meta.apiSinks) {
        apiEndpoints.push(sink);
      }
    }

    let baseUrl = '';
    if (apiEndpoints.length > 0) {
      const urls = apiEndpoints.map(e => e.urlPattern).filter(u => u.startsWith('http://') || u.startsWith('https://'));
      if (urls.length > 0) {
        try {
          const parsed = new URL(urls[0]);
          baseUrl = parsed.origin;
        } catch {
          // fallback
        }
      }
    }

    const apiSurface: ApiSurface = {
      baseUrl,
      endpoints: apiEndpoints
    };

    const openapi = this.generateOpenApi(apiSurface);

    // Write all global output artifacts to disk
    await fs.writeFile(path.join(targetDirectory, 'module-graph.json'), JSON.stringify(moduleGraph, null, 2), 'utf-8');
    await fs.writeFile(path.join(targetDirectory, 'call-graph.json'), JSON.stringify(callGraph, null, 2), 'utf-8');
    await fs.writeFile(path.join(targetDirectory, 'api-surface.json'), JSON.stringify(apiSurface, null, 2), 'utf-8');
    await fs.writeFile(path.join(targetDirectory, 'openapi.json'), JSON.stringify(openapi, null, 2), 'utf-8');

    console.log(`[Reducer] Successfully wrote module-graph.json, call-graph.json, api-surface.json, openapi.json`);
  }

  private async findMetadataFiles(dir: string): Promise<string[]> {
    const results: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...(await this.findMetadataFiles(fullPath)));
      } else if (entry.isFile() && entry.name.endsWith('.metadata.json')) {
        results.push(fullPath);
      }
    }

    return results;
  }

  private generateOpenApi(apiSurface: ApiSurface): any {
    const paths: Record<string, any> = {};

    for (const ep of apiSurface.endpoints) {
      let epPath = ep.urlPattern;
      if (apiSurface.baseUrl && epPath.startsWith(apiSurface.baseUrl)) {
        epPath = epPath.substring(apiSurface.baseUrl.length);
      }
      if (!epPath.startsWith('/')) {
        epPath = '/' + epPath;
      }

      const openApiPath = epPath.replace(/\$\{\.\.\.\}/g, '{param}').replace(/\$\{[^}]+\}/g, '{param}');

      if (!paths[openApiPath]) {
        paths[openApiPath] = {};
      }

      const methodLower = ep.method.toLowerCase();
      paths[openApiPath][methodLower] = {
        summary: `Statically extracted ${ep.method} endpoint`,
        responses: {
          '200': {
            description: 'Successful response'
          }
        }
      };
    }

    return {
      openapi: '3.0.0',
      info: {
        title: 'JS Cartographer Extracted API Surface',
        version: '1.0.0'
      },
      servers: apiSurface.baseUrl ? [{ url: apiSurface.baseUrl }] : [],
      paths
    };
  }
}
