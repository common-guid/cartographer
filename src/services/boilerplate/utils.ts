import type { File, Statement } from '@babel/types';

export function getStatementsToProcess(ast: File): { statements: Statement[]; isWrapped: boolean } {
  const body = ast.program.body;
  if (body.length === 1) {
    const node = body[0];
    if (node.type === 'ExpressionStatement') {
      const expr = node.expression;
      // !function() { ... }()
      if (
        expr.type === 'UnaryExpression' &&
        expr.operator === '!' &&
        expr.argument.type === 'CallExpression'
      ) {
        const call = expr.argument;
        if (
          (call.callee.type === 'FunctionExpression' ||
            call.callee.type === 'ArrowFunctionExpression') &&
          call.callee.body.type === 'BlockStatement'
        ) {
          return { statements: call.callee.body.body, isWrapped: true };
        }
      }
      // (function() { ... })()
      if (expr.type === 'CallExpression') {
        if (
          (expr.callee.type === 'FunctionExpression' ||
            expr.callee.type === 'ArrowFunctionExpression') &&
          expr.callee.body.type === 'BlockStatement'
        ) {
          return { statements: expr.callee.body.body, isWrapped: true };
        }
      }
    }
  }
  return { statements: body, isWrapped: false };
}
