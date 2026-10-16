import { describe, expect, it } from 'vitest';
import { isValidAdditionalTime } from '../utils';
import { timeSchema } from '../zodSchemas';

// Additional time renders on air as "+N", so anything but whole positive
// minutes ("+ -2", "+2.5") must be rejected by the input, the handler and the
// persisted-state schema alike.
describe('additional time validation', () => {
  it.each([1, 3, 17, 45])('accepts whole positive minutes (%s)', (minutes) => {
    expect(isValidAdditionalTime(minutes)).toBe(true);
    expect(timeSchema.parse({ additionalTime: minutes }).additionalTime).toBe(
      minutes
    );
  });

  it.each([0, -2, 2.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects %s',
    (minutes) => {
      expect(isValidAdditionalTime(minutes)).toBe(false);
      expect(
        timeSchema.parse({ additionalTime: minutes }).additionalTime
      ).toBeUndefined();
    }
  );

  it('rejects a non-number', () => {
    expect(isValidAdditionalTime('3')).toBe(false);
    expect(isValidAdditionalTime(undefined)).toBe(false);
  });
});
