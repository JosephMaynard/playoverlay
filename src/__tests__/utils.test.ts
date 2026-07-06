import { describe, expect, it, vi } from 'vitest';
import {
  arraysEqual,
  calculatePenalties,
  checkColors,
  classNames,
  debounce,
  getMatchPhases,
  insertValue,
  removeValue,
  timeToString,
} from '../utils';

describe('utils', () => {
  describe('timeToString', () => {
    it('formats seconds as minutes and zero-padded seconds', () => {
      expect(timeToString(0)).toBe('0:00');
      expect(timeToString(9)).toBe('0:09');
      expect(timeToString(65)).toBe('1:05');
      expect(timeToString(3605)).toBe('60:05');
    });
  });

  describe('checkColors', () => {
    it('returns true when colours are closer than the tolerance', () => {
      expect(checkColors('#000000', '#000001')).toBe(true);
    });

    it('returns false when colours are distinct', () => {
      expect(checkColors('#000000', '#ffffff')).toBe(false);
    });
  });

  describe('calculatePenalties', () => {
    it('counts scored penalties for each team and ignores misses', () => {
      expect(
        calculatePenalties([
          { team: 'home', result: 'scored' },
          { team: 'home', result: 'missed' },
          { team: 'away', result: 'scored' },
          { team: 'away', result: 'scored' },
        ])
      ).toEqual({
        homeTeamPenaltiesScored: 1,
        awayTeamPenaltiesScored: 2,
      });
    });
  });

  describe('classNames', () => {
    it('joins truthy classes with spaces', () => {
      expect(classNames('base', '', 'active')).toBe('base active');
    });
  });

  describe('getMatchPhases', () => {
    it('derives normal and extra-time phase ranges from match lengths', () => {
      expect(getMatchPhases(40, 10)).toEqual({
        firstHalf: { title: 'First Half', start: 0, end: 40 },
        secondHalf: { title: 'Second Half', start: 40, end: 80 },
        extraTimeFirstHalf: {
          title: 'Extra Time First Half',
          start: 80,
          end: 90,
        },
        extraTimeSecondHalf: {
          title: 'Extra Time Second Half',
          start: 90,
          end: 100,
        },
      });
    });
  });

  describe('arraysEqual', () => {
    it('compares arrays independent of order', () => {
      expect(arraysEqual(['scoreBug', 'endScreen'], ['endScreen', 'scoreBug']))
        .toBe(true);
    });

    it('returns false for undefined arrays or different values', () => {
      expect(arraysEqual(undefined, ['scoreBug'])).toBe(false);
      expect(arraysEqual(['scoreBug'], ['matchTitle'])).toBe(false);
    });
  });

  describe('insertValue', () => {
    it('adds a missing value without mutating the source array', () => {
      const source = ['scoreBug'];

      expect(insertValue(source, 'endScreen')).toEqual([
        'scoreBug',
        'endScreen',
      ]);
      expect(source).toEqual(['scoreBug']);
    });

    it('returns the original array when the value already exists', () => {
      const source = ['scoreBug'];

      expect(insertValue(source, 'scoreBug')).toBe(source);
    });
  });

  describe('removeValue', () => {
    it('removes every matching value', () => {
      expect(removeValue(['a', 'b', 'a'], 'a')).toEqual(['b']);
    });
  });

  describe('debounce', () => {
    it('runs the last call after the delay', () => {
      vi.useFakeTimers();
      const callback = vi.fn();
      const debounced = debounce(callback, 250);

      debounced('first');
      debounced('second');
      vi.advanceTimersByTime(249);
      expect(callback).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('second');

      vi.useRealTimers();
    });
  });
});
