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
    // Pre-release/build suffixes are stripped rather than producing NaN parts
    ['0.16.0-beta.1', '0.15.0', 1],
    ['0.15.0', '0.16.0-beta.1', -1],
    ['0.16.0-beta.1', '0.16.0', 0],
    ['1.0.0+build.5', '1.0.0', 0],
    ['1.0.0-rc.2+build.5', '1.0.1', -1],
    // Unparseable parts are treated as 0 instead of poisoning the comparison
    ['1.0.x', '1.0.0', 0],
    ['1.0.x', '1.0.1', -1],
  ])('compares %s with %s', (left, right, expected) => {
    expect(compareSemver(left, right)).toBe(expected);
  });
});
