import { describe, expect, it } from 'vitest';
import { clockFontSize } from '../TimeDisplay/TimeDisplay';

const cqw = (size: string) => Number(/([\d.]+)cqw/.exec(size)?.[1]);

describe('clockFontSize', () => {
  it('keeps one size from kick-off to 99:59', () => {
    expect(clockFontSize('0:00')).toBe(clockFontSize('45:00'));
    expect(clockFontSize('99:59')).toBe(clockFontSize('45:00'));
  });

  it('steps down for three-digit minutes and for added time, so both still fit', () => {
    expect(cqw(clockFontSize('105:13'))).toBeLessThan(
      cqw(clockFontSize('45:00'))
    );
    expect(cqw(clockFontSize('105:13', 5))).toBeLessThan(
      cqw(clockFontSize('105:13'))
    );
    expect(cqw(clockFontSize('105:13', 10))).toBeLessThan(
      cqw(clockFontSize('105:13', 5))
    );
  });

  it('makes room for the remaining time, and keeps one size when it goes negative', () => {
    expect(cqw(clockFontSize('45:00', undefined, '00:00'))).toBeLessThan(
      cqw(clockFontSize('45:00'))
    );
    expect(clockFontSize('44:30', undefined, '00:30')).toBe(
      clockFontSize('45:30', undefined, '-0:30')
    );
    expect(clockFontSize('45:30', undefined, '-0:30')).toBe(
      clockFontSize('59:47', undefined, '-14:47')
    );
  });
});
