import type { Node } from '@babel/types';

export function isFunctionDeclarationOrExpression(node: Node): boolean {
  return (
    node.type === 'FunctionDeclaration' ||
    node.type === 'FunctionExpression' ||
    node.type === 'ArrowFunctionExpression'
  );
}

/**
 * Counts the top-level statements in a function or block structure.
 */
export function getStatementCount(node: Node): number {
  if (!node) return 0;

  if (node.type === 'BlockStatement') {
    return node.body.length;
  }

  if (
    node.type === 'FunctionDeclaration' ||
    node.type === 'FunctionExpression' ||
    node.type === 'ArrowFunctionExpression'
  ) {
    if (node.body.type === 'BlockStatement') {
      return node.body.body.length;
    }
    return 1; // Single expression arrow function
  }

  if (node.type === 'VariableDeclaration') {
    let maxCount = 0;
    for (const decl of node.declarations) {
      if (decl.init) {
        maxCount = Math.max(maxCount, getStatementCount(decl.init));
      }
    }
    return maxCount || 1;
  }

  if (node.type === 'ExpressionStatement') {
    return getStatementCount(node.expression);
  }

  if (node.type === 'CallExpression') {
    // For IIFEs: e.g. (function() { ... })()
    if (
      node.callee.type === 'FunctionExpression' ||
      node.callee.type === 'ArrowFunctionExpression'
    ) {
      return getStatementCount(node.callee);
    }
    // Also check unary expressions wrapping IIFE, e.g. !function(){}()
    return 1;
  }

  if (node.type === 'UnaryExpression') {
    return getStatementCount(node.argument);
  }

  return 1;
}

/**
 * Helper to guard against classifying large application functions as boilerplate.
 * Returns true if the statement count is <= maxStatements.
 */
export function isShortFunction(node: Node, maxStatements: number = 12): boolean {
  return getStatementCount(node) <= maxStatements;
}
