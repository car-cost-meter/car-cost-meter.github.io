import { describe, test, expect } from 'bun:test';
import { evalFormula } from './Formula.js';

describe('evalFormula', () => {
  test('plain numbers, both decimal separators', () => {
    expect(evalFormula('1234')).toBe(1234);
    expect(evalFormula('12,50')).toBe(12.5);
    expect(evalFormula('12.50')).toBe(12.5);
    expect(evalFormula('.5')).toBe(0.5);
  });

  test('arithmetic, precedence, parentheses', () => {
    expect(evalFormula('1+2*3')).toBe(7);
    expect(evalFormula('(1+2)*3')).toBe(9);
    expect(evalFormula('10-4/2')).toBe(8);
    expect(evalFormula('1000*(1+5%)')).toBeCloseTo(1050);
    expect(evalFormula('-3+10')).toBe(7);
  });

  test('stray whitespace between tokens is ignored', () => {
    expect(evalFormula(' 10 + 5 ')).toBe(15);
    // …but a space inside a number does not merge digits (same as
    // mon-patrimoine): '1 234,5' is two adjacent numbers → invalid.
    expect(Number.isNaN(evalFormula('1 234,5'))).toBe(true);
  });

  test('invalid input is NaN', () => {
    expect(Number.isNaN(evalFormula(''))).toBe(true);
    expect(Number.isNaN(evalFormula('1+'))).toBe(true);
    expect(Number.isNaN(evalFormula('abc'))).toBe(true);
    expect(Number.isNaN(evalFormula('1/0'))).toBe(true);
    expect(Number.isNaN(evalFormula('1,2,3'))).toBe(true);
    expect(Number.isNaN(evalFormula('(1+2'))).toBe(true);
  });
});
