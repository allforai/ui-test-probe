import { describe, it, expect } from 'vitest';
import { evaluateExpectation } from './assertion-engine';

describe('evaluateExpectation', () => {
  it('passes not_null check', () => {
    expect(evaluateExpectation({ id: 'x' }, { not_null: true })).toBe(true);
  });
  it('fails not_null when null', () => {
    expect(evaluateExpectation(null, { not_null: true })).toBe(false);
  });
  it('passes is_null check', () => {
    expect(evaluateExpectation(null, { is_null: true })).toBe(true);
  });
  it('checks fields with eq', () => {
    expect(evaluateExpectation(
      { id: 'order-table', type: 'data-container' },
      { fields: { id: 'order-table', type: 'data-container' } }
    )).toBe(true);
  });
  it('checks nested fields with dot notation', () => {
    expect(evaluateExpectation(
      { state: { current: 'loaded' } },
      { fields: { 'state.current': 'loaded' } }
    )).toBe(true);
  });
  it('checks gt operator', () => {
    expect(evaluateExpectation(
      { layout: { width: 500 } },
      { fields: { 'layout.width': { gt: 0 } } }
    )).toBe(true);
  });
  it('checks contains operator', () => {
    expect(evaluateExpectation(
      { source: 'GET /api/orders' },
      { fields: { source: { contains: '/api/orders' } } }
    )).toBe(true);
  });
  it('checks has_length operator', () => {
    expect(evaluateExpectation(
      { children: ['a', 'b', 'c'] },
      { fields: { children: { has_length: 3 } } }
    )).toBe(true);
  });
  it('fails on field mismatch', () => {
    expect(evaluateExpectation(
      { id: 'wrong' },
      { fields: { id: 'expected' } }
    )).toBe(false);
  });
});
