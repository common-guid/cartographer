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
    let count = 0;
    for (const stmt of node.body) {
      count += getStatementCount(stmt);
    }
    return count;
  }

  if (
    node.type === 'FunctionDeclaration' ||
    node.type === 'FunctionExpression' ||
    node.type === 'ArrowFunctionExpression'
  ) {
    if (node.body.type === 'BlockStatement') {
      return getStatementCount(node.body);
    }
    return 1; // Single expression arrow function
  }

  if (node.type === 'VariableDeclaration') {
    let count = 0;
    for (const decl of node.declarations) {
      if (decl.init) {
        count += getStatementCount(decl.init);
      }
    }
    return count || 1;
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

  if (node.type === 'TryStatement') {
    let count = getStatementCount(node.block);
    if (node.handler) {
      count += getStatementCount(node.handler.body);
    }
    if (node.finalizer) {
      count += getStatementCount(node.finalizer);
    }
    return count;
  }

  if (node.type === 'IfStatement') {
    let count = getStatementCount(node.consequent);
    if (node.alternate) {
      count += getStatementCount(node.alternate);
    }
    return count;
  }

  if (
    node.type === 'ForStatement' ||
    node.type === 'ForInStatement' ||
    node.type === 'ForOfStatement' ||
    node.type === 'WhileStatement' ||
    node.type === 'DoWhileStatement'
  ) {
    return getStatementCount(node.body);
  }

  if (node.type === 'SwitchStatement') {
    let count = 0;
    for (const caseNode of node.cases) {
      for (const stmt of caseNode.consequent) {
        count += getStatementCount(stmt);
      }
    }
    return count;
  }

  return 1;
}

/**
 * Helper to guard against classifying large application functions as boilerplate.
 * Returns true if the statement count is <= maxStatements.
 */
export function isShortFunction(node: Node, maxStatements: number = 12): boolean {
  // Reject nodes that are not function-like or direct function wrappers
  if (
    !isFunctionDeclarationOrExpression(node) &&
    node.type !== 'VariableDeclaration' &&
    node.type !== 'ExpressionStatement' &&
    node.type !== 'UnaryExpression'
  ) {
    return false;
  }
  return getStatementCount(node) <= maxStatements;
}

