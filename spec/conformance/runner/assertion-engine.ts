import type { Expectation, ComparisonOp } from './types';

function getPath(obj: unknown, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function isComparisonOp(value: unknown): value is ComparisonOp {
  if (value == null || typeof value !== 'object') return false;
  const keys = Object.keys(value);
  const opKeys = ['gt', 'lt', 'gte', 'lte', 'contains', 'has_length', 'matches'];
  return keys.some(k => opKeys.includes(k));
}

function evaluateComparison(actual: unknown, op: ComparisonOp): boolean {
  if (op.gt !== undefined) return typeof actual === 'number' && actual > op.gt;
  if (op.lt !== undefined) return typeof actual === 'number' && actual < op.lt;
  if (op.gte !== undefined) return typeof actual === 'number' && actual >= op.gte;
  if (op.lte !== undefined) return typeof actual === 'number' && actual <= op.lte;
  if (op.contains !== undefined) return typeof actual === 'string' && actual.includes(op.contains);
  if (op.has_length !== undefined) return Array.isArray(actual) && actual.length === op.has_length;
  if (op.matches !== undefined) return typeof actual === 'string' && new RegExp(op.matches).test(actual);
  return false;
}

export function evaluateExpectation(actual: unknown, expect: Expectation): boolean {
  if (expect.is_null) return actual == null;
  if (expect.not_null && actual == null) return false;
  if (expect.is_true && actual !== true) return false;
  if (expect.is_false && actual !== false) return false;

  if (expect.fields) {
    for (const [path, expected] of Object.entries(expect.fields)) {
      const actualValue = getPath(actual, path);
      if (isComparisonOp(expected)) {
        if (!evaluateComparison(actualValue, expected)) return false;
      } else {
        if (actualValue !== expected) return false;
      }
    }
  }

  return true;
}
