import { describe, expect, it } from 'vitest';
import compareSemver from '../compareSemver';

describe('compareSemver', () => {
  it.each([
    ['1.0.0', '1.0.0', 0],
    ['1.0.1', '1.0.0', 1],
    ['1.1.0', '1.0.9', 1],
    ['2.0.0', '1.99.99', 1],
    ['1.0.0', '1.0.1', -1],
    ['1.0.9', '1.1.0', -1],
    ['1.99.99', '2.0.0', -1],
  ])('compares %s with %s', (left, right, expected) => {
    expect(compareSemver(left, right)).toBe(expected);
  });
});
