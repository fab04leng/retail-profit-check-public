import { describe, expect, it } from 'vitest';
import { parseNumber, parsePercent, roundRM } from '../../src/core/numbers';

describe('parseNumber', () => {
  it.each([
    ['12', 12],
    ['12.50', 12.5],
    ['1,234.50', 1234.5],
    ['1,234,567', 1234567],
    ['RM 1,234.50', 1234.5],
    ['RM1,234.50', 1234.5],
    ['MYR 3.20', 3.2],
    ['-5', -5],
    ['(12.00)', -12],
    ['12.00-', -12],
    ['RM -3', -3],
    ['  7 ', 7],
    ['1.234,56', 1234.56],
    ['12,5', 12.5],
    ['１２３', 123],
    ['+4', 4],
    ['.5', 0.5],
  ])('parses %s', (input, expected) => {
    expect(parseNumber(input)).toBeCloseTo(expected, 6);
  });

  it.each([[''], ['abc'], ['12abc'], ['1,23,4'], [null], [undefined], [true], [Number.NaN], [Infinity], ['--5']])('rejects %s', (input) => {
    expect(parseNumber(input)).toBeNull();
  });

  it('keeps "1,234" as one thousand two hundred thirty-four, not 1.234', () => {
    expect(parseNumber('1,234')).toBe(1234);
  });

  it('passes through real numbers', () => {
    expect(parseNumber(42.1)).toBe(42.1);
  });
});

describe('parsePercent / roundRM', () => {
  it('parses percentages only', () => {
    expect(parsePercent('10%')).toBe(10);
    expect(parsePercent('12.5 %')).toBe(12.5);
    expect(parsePercent('10')).toBeNull();
  });
  it('rounds to sen', () => {
    expect(roundRM(0.1 + 0.2)).toBe(0.3);
    expect(roundRM(1.005)).toBe(1.01);
  });
});
