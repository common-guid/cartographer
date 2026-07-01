import _babelCore from '@babel/core';
import { BabelASTService } from '../ast/babel-core.js';

export interface FileMetadata {
  id: string; // Relative path, e.g., "src/auth.js"
  imports: string[]; // Raw import strings: ["./utils", "react"]
  exports: string[]; // Exported symbol names: ["loginUser", "Token"]
  definedFunctions: {
    id: string; // e.g., "src/auth.js:loginUser"
    name: string;
    line: number;
  }[];
  calls: {
    from: string; // Caller ID
    to: string; // Callee Name (unresolved)
    type: "internal" | "external";
  }[];
  apiSinks: {
    method: string;
    urlPattern: string; // e.g., "/api/users/${id}"
  }[];
}

export class ASTExtractorService {
  constructor(private astService = new BabelASTService()) {}

  extractMetadata(ast: _babelCore.types.File, filepath: string): FileMetadata {
    const imports: string[] = [];
    const exports: string[] = [];
    const definedFunctions: { id: string; name: string; line: number }[] = [];
    const calls: { from: string; to: string; type: "internal" | "external" }[] = [];
    const apiSinks: { method: string; urlPattern: string }[] = [];

    // Keep track of what local names are imported from where
    // localName -> importSource
    const importBindings = new Map<string, string>();
    const localFuncs = new Set<string>();

    this.astService.traverseAst(ast, {
      // 1. Capture Imports
      ImportDeclaration(path: any) {
        const source = path.node.source.value;
        if (!imports.includes(source)) {
          imports.push(source);
        }
        for (const spec of path.node.specifiers) {
          importBindings.set(spec.local.name, source);
        }
      },
      CallExpression(path: any) {
        // CommonJS require
        if (
          path.node.callee.type === 'Identifier' &&
          path.node.callee.name === 'require' &&
          path.node.arguments[0]?.type === 'StringLiteral'
        ) {
          const source = path.node.arguments[0].value;
          if (!imports.includes(source)) {
            imports.push(source);
          }
        }
        // Dynamic import
        if (
          path.node.callee.type === 'Import' &&
          path.node.arguments[0]?.type === 'StringLiteral'
        ) {
          const source = path.node.arguments[0].value;
          if (!imports.includes(source)) {
            imports.push(source);
          }
        }
      },

      // 2. Capture Exports
      ExportNamedDeclaration(path: any) {
        if (path.node.declaration) {
          if (path.node.declaration.type === 'FunctionDeclaration' && path.node.declaration.id) {
            exports.push(path.node.declaration.id.name);
          } else if (path.node.declaration.type === 'VariableDeclaration') {
            for (const decl of path.node.declaration.declarations) {
              if (decl.id.type === 'Identifier') {
                exports.push(decl.id.name);
              }
            }
          }
        }
        if (path.node.specifiers) {
          for (const spec of path.node.specifiers) {
            exports.push(spec.exported.name);
          }
        }
      },
      ExportDefaultDeclaration(path: any) {
        exports.push('default');
      },

      // 3. Register Function Definitions
      FunctionDeclaration(path: any) {
        if (path.node.id) {
          const name = path.node.id.name;
          const line = path.node.loc?.start.line ?? 0;
          definedFunctions.push({
            id: `${filepath}:${name}`,
            name,
            line
          });
          localFuncs.add(name);
        }
      },
      VariableDeclarator(path: any) {
        const id = path.node.id;
        const init = path.node.init;
        if (id.type === 'Identifier' && init && (init.type === 'FunctionExpression' || init.type === 'ArrowFunctionExpression')) {
          const name = id.name;
          const line = path.node.loc?.start.line ?? 0;
          definedFunctions.push({
            id: `${filepath}:${name}`,
            name,
            line
          });
          localFuncs.add(name);
        }
      }
    });

    // Pass 2: Extract Calls & Sinks
    this.astService.traverseAst(ast, {
      CallExpression(path: any) {
        const callee = path.node.callee;
        
        // Find enclosing function
        let parent: any = path.parentPath;
        let callerName = 'root';
        while (parent) {
          if (
            parent.node.type === 'FunctionDeclaration' &&
            parent.node.id
          ) {
            callerName = parent.node.id.name;
            break;
          }
          if (
            parent.node.type === 'VariableDeclarator' &&
            parent.node.id?.type === 'Identifier' &&
            (parent.node.init?.type === 'FunctionExpression' || parent.node.init?.type === 'ArrowFunctionExpression')
          ) {
            callerName = parent.node.id.name;
            break;
          }
          parent = parent.parentPath;
        }
        const from = `${filepath}:${callerName}`;

        let to = '';
        let isExternal = false;

        if (callee.type === 'Identifier') {
          to = callee.name;
          isExternal = importBindings.has(to);
        } else if (callee.type === 'MemberExpression') {
          if (callee.object.type === 'Identifier') {
            to = `${callee.object.name}.${callee.property.name}`;
            isExternal = importBindings.has(callee.object.name);
          }
        }

        if (to) {
          calls.push({
            from,
            to,
            type: isExternal ? 'external' : 'internal'
          });
        }

        // Detect API Sinks (fetch, axios)
        let isFetch = false;
        let isAxios = false;
        let urlArg: any = null;
        let method = 'GET';

        if (callee.type === 'Identifier' && callee.name === 'fetch') {
          isFetch = true;
          urlArg = path.node.arguments[0];
          const optsArg = path.node.arguments[1];
          if (optsArg && optsArg.type === 'ObjectExpression') {
            for (const prop of optsArg.properties) {
              if (
                prop.type === 'ObjectProperty' &&
                prop.key.type === 'Identifier' &&
                prop.key.name === 'method' &&
                prop.value.type === 'StringLiteral'
              ) {
                method = prop.value.value.toUpperCase();
              }
            }
          }
        } else if (
          callee.type === 'Identifier' &&
          callee.name === 'axios'
        ) {
          isAxios = true;
          urlArg = path.node.arguments[0];
          if (urlArg && urlArg.type === 'ObjectExpression') {
            const tempUrlArg = urlArg;
            urlArg = null;
            for (const prop of tempUrlArg.properties) {
              if (prop.type === 'ObjectProperty' && prop.key.type === 'Identifier') {
                if (prop.key.name === 'url' && prop.value.type === 'StringLiteral') {
                  urlArg = prop.value;
                }
                if (prop.key.name === 'method' && prop.value.type === 'StringLiteral') {
                  method = prop.value.value.toUpperCase();
                }
              }
            }
          }
        } else if (
          callee.type === 'MemberExpression' &&
          callee.object.type === 'Identifier' &&
          callee.object.name === 'axios'
        ) {
          const methodName = callee.property.name.toLowerCase();
          if (['get', 'post', 'put', 'delete', 'patch', 'head'].includes(methodName)) {
            isAxios = true;
            method = methodName.toUpperCase();
            urlArg = path.node.arguments[0];
          }
        }

        if ((isFetch || isAxios) && urlArg) {
          let urlPattern = '';
          if (urlArg.type === 'StringLiteral') {
            urlPattern = urlArg.value;
          } else if (urlArg.type === 'TemplateLiteral') {
            let index = 0;
            for (const quark of urlArg.quasis) {
              urlPattern += quark.value.raw;
              if (index < urlArg.expressions.length) {
                urlPattern += '${...}';
              }
              index++;
            }
          } else {
            urlPattern = '${dynamic}';
          }
          apiSinks.push({ method, urlPattern });
        }
      }
    });

    return {
      id: filepath,
      imports,
      exports,
      definedFunctions,
      calls,
      apiSinks
    };
  }
}
