import { describe, expect, it, vi } from 'vitest';
import {
  arraysEqual,
  calculatePenalties,
  checkColors,
  chunkArray,
  classNames,
  debounce,
  deriveGlobalAccelerator,
  formatTimeOfDay,
  getKeyboardShortcuts,
  getNextPhaseId,
  getPhaseById,
  getPhaseList,
  insertValue,
  keyboardEventToAccelerator,
  removeValue,
  secondsUntilKickOff,
  timeToString,
} from '../utils';
import { defaultAppSettings, defaultKeyboardShortcuts, defaultMatchSettings } from '../constants';
import { MatchSettings } from '../zodSchemas';

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

  describe('getPhaseList', () => {
    const footballSettings: MatchSettings = {
      ...defaultMatchSettings,
      halfLength: 40,
      extraTimeHalfLength: 10,
    };

    it('derives the same football phases the old getMatchPhases produced (default timerMode)', () => {
      expect(getPhaseList(footballSettings)).toEqual([
        { id: 'firstHalf', title: 'First Half', start: 0, end: 40 },
        { id: 'secondHalf', title: 'Second Half', start: 40, end: 80 },
        {
          id: 'extraTimeFirstHalf',
          title: 'Extra Time First Half',
          start: 80,
          end: 90,
        },
        {
          id: 'extraTimeSecondHalf',
          title: 'Extra Time Second Half',
          start: 90,
          end: 100,
        },
      ]);
    });

    it('matches the historical defaults (45/15) when lengths are unset', () => {
      expect(
        getPhaseList({ ...defaultMatchSettings, halfLength: undefined, extraTimeHalfLength: undefined })
      ).toEqual([
        { id: 'firstHalf', title: 'First Half', start: 0, end: 45 },
        { id: 'secondHalf', title: 'Second Half', start: 45, end: 90 },
        {
          id: 'extraTimeFirstHalf',
          title: 'Extra Time First Half',
          start: 90,
          end: 105,
        },
        {
          id: 'extraTimeSecondHalf',
          title: 'Extra Time Second Half',
          start: 105,
          end: 120,
        },
      ]);
    });

    it('omits the extra-time phases when hasExtraTime is false', () => {
      expect(
        getPhaseList({ ...footballSettings, hasExtraTime: false })
      ).toEqual([
        { id: 'firstHalf', title: 'First Half', start: 0, end: 40 },
        { id: 'secondHalf', title: 'Second Half', start: 40, end: 80 },
      ]);
    });

    it('builds evenly-sized named periods in generic mode', () => {
      expect(
        getPhaseList({
          ...defaultMatchSettings,
          timerMode: 'generic',
          periodCount: 3,
          periodLength: 20,
          periodName: 'Quarter',
        })
      ).toEqual([
        { id: 'period1', title: 'Quarter 1', start: 0, end: 20 },
        { id: 'period2', title: 'Quarter 2', start: 20, end: 40 },
        { id: 'period3', title: 'Quarter 3', start: 40, end: 60 },
      ]);
    });

    it('falls back to 4x10 minute periods named "Period" when unset', () => {
      expect(
        getPhaseList({ ...defaultMatchSettings, timerMode: 'generic' })
      ).toEqual([
        { id: 'period1', title: 'Period 1', start: 0, end: 10 },
        { id: 'period2', title: 'Period 2', start: 10, end: 20 },
        { id: 'period3', title: 'Period 3', start: 20, end: 30 },
        { id: 'period4', title: 'Period 4', start: 30, end: 40 },
      ]);
    });
  });

  describe('getPhaseById', () => {
    it('looks up a phase by id', () => {
      expect(getPhaseById(defaultMatchSettings, 'secondHalf')).toEqual({
        id: 'secondHalf',
        title: 'Second Half',
        start: 45,
        end: 90,
      });
    });

    it('returns undefined for an undefined or unknown id', () => {
      expect(getPhaseById(defaultMatchSettings, undefined)).toBeUndefined();
      expect(getPhaseById(defaultMatchSettings, 'notAPhase')).toBeUndefined();
    });
  });

  describe('getNextPhaseId', () => {
    const phaseList = getPhaseList(defaultMatchSettings);

    it('stops (returns undefined) when a phase is currently running', () => {
      expect(getNextPhaseId(phaseList, 'firstHalf', undefined)).toBeUndefined();
    });

    it('starts at the first phase when nothing has run yet', () => {
      expect(getNextPhaseId(phaseList, undefined, undefined)).toBe(
        'firstHalf'
      );
    });

    it('walks to the phase after previousPhaseId', () => {
      expect(getNextPhaseId(phaseList, undefined, 'firstHalf')).toBe(
        'secondHalf'
      );
      expect(getNextPhaseId(phaseList, undefined, 'secondHalf')).toBe(
        'extraTimeFirstHalf'
      );
      expect(getNextPhaseId(phaseList, undefined, 'extraTimeFirstHalf')).toBe(
        'extraTimeSecondHalf'
      );
    });

    it('returns undefined once the last phase has finished', () => {
      expect(
        getNextPhaseId(phaseList, undefined, 'extraTimeSecondHalf')
      ).toBeUndefined();
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

  describe('getKeyboardShortcuts', () => {
    it('falls back to the historical defaults when appSettings has no customization', () => {
      expect(getKeyboardShortcuts(defaultAppSettings)).toEqual(
        defaultKeyboardShortcuts
      );
    });

    it('layers custom bindings on top of the defaults', () => {
      expect(
        getKeyboardShortcuts({
          ...defaultAppSettings,
          keyboardShortcuts: { ...defaultKeyboardShortcuts, homeTeamScored: 'CommandOrControl+Shift+J' },
        })
      ).toEqual({
        ...defaultKeyboardShortcuts,
        homeTeamScored: 'CommandOrControl+Shift+J',
      });
    });

    it('fills in a missing individual action from the defaults', () => {
      expect(
        getKeyboardShortcuts({
          ...defaultAppSettings,
          keyboardShortcuts: {
            nextMatchPhase: 'CommandOrControl+Shift+N',
          } as Partial<typeof defaultKeyboardShortcuts> as typeof defaultKeyboardShortcuts,
        })
      ).toEqual({
        ...defaultKeyboardShortcuts,
        nextMatchPhase: 'CommandOrControl+Shift+N',
      });
    });
  });

  describe('deriveGlobalAccelerator', () => {
    it('inserts Alt right after CommandOrControl, matching the historical global shortcuts', () => {
      expect(deriveGlobalAccelerator('CommandOrControl+Shift+Space')).toBe(
        'CommandOrControl+Alt+Shift+Space'
      );
      expect(deriveGlobalAccelerator('CommandOrControl+Shift+H')).toBe(
        'CommandOrControl+Alt+Shift+H'
      );
      expect(deriveGlobalAccelerator('CommandOrControl+Shift+A')).toBe(
        'CommandOrControl+Alt+Shift+A'
      );
    });

    it('returns null when the accelerator already includes Alt', () => {
      expect(deriveGlobalAccelerator('CommandOrControl+Alt+H')).toBeNull();
      expect(deriveGlobalAccelerator('Alt+Shift+H')).toBeNull();
    });

    it('returns null when there is no CommandOrControl/Cmd/Ctrl modifier to anchor on', () => {
      expect(deriveGlobalAccelerator('Shift+H')).toBeNull();
    });
  });

  describe('keyboardEventToAccelerator', () => {
    it('builds a CommandOrControl+Shift+<letter> accelerator from a keydown', () => {
      expect(
        keyboardEventToAccelerator({
          metaKey: true,
          ctrlKey: false,
          altKey: false,
          shiftKey: true,
          key: 'h',
          code: 'KeyH',
        })
      ).toBe('CommandOrControl+Shift+H');
    });

    it('treats ctrlKey the same as metaKey', () => {
      expect(
        keyboardEventToAccelerator({
          metaKey: false,
          ctrlKey: true,
          altKey: false,
          shiftKey: true,
          key: 'a',
          code: 'KeyA',
        })
      ).toBe('CommandOrControl+Shift+A');
    });

    it('maps the space key to "Space"', () => {
      expect(
        keyboardEventToAccelerator({
          metaKey: true,
          ctrlKey: false,
          altKey: false,
          shiftKey: true,
          key: ' ',
          code: 'Space',
        })
      ).toBe('CommandOrControl+Shift+Space');
    });

    it('uses the physical key code for digits, ignoring a shifted symbol', () => {
      expect(
        keyboardEventToAccelerator({
          metaKey: true,
          ctrlKey: false,
          altKey: false,
          shiftKey: true,
          key: '@', // Shift+2 on a US layout
          code: 'Digit2',
        })
      ).toBe('CommandOrControl+Shift+2');
    });

    it('supports F-keys', () => {
      expect(
        keyboardEventToAccelerator({
          metaKey: true,
          ctrlKey: false,
          altKey: false,
          shiftKey: false,
          key: 'F5',
          code: 'F5',
        })
      ).toBe('CommandOrControl+F5');
    });

    it('allows Alt alone to satisfy the non-Shift modifier requirement', () => {
      expect(
        keyboardEventToAccelerator({
          metaKey: false,
          ctrlKey: false,
          altKey: true,
          shiftKey: false,
          key: 'k',
          code: 'KeyK',
        })
      ).toBe('Alt+K');
    });

    it('returns null for a modifier-only keydown', () => {
      expect(
        keyboardEventToAccelerator({
          metaKey: true,
          ctrlKey: false,
          altKey: false,
          shiftKey: false,
          key: 'Meta',
          code: 'MetaLeft',
        })
      ).toBeNull();
    });

    it('returns null when there is no non-Shift modifier', () => {
      expect(
        keyboardEventToAccelerator({
          metaKey: false,
          ctrlKey: false,
          altKey: false,
          shiftKey: true,
          key: 'h',
          code: 'KeyH',
        })
      ).toBeNull();
    });

    it('returns null for keys it does not know how to bind', () => {
      expect(
        keyboardEventToAccelerator({
          metaKey: true,
          ctrlKey: false,
          altKey: false,
          shiftKey: false,
          key: 'Escape',
          code: 'Escape',
        })
      ).toBeNull();
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

  describe('chunkArray', () => {
    it('splits an array into chunks of the given size', () => {
      expect(chunkArray([1, 2, 3, 4, 5, 6, 7], 5)).toEqual([
        [1, 2, 3, 4, 5],
        [6, 7],
      ]);
    });

    it('returns a single exact chunk when the array length is a multiple of size', () => {
      expect(chunkArray([1, 2, 3, 4], 2)).toEqual([
        [1, 2],
        [3, 4],
      ]);
    });

    it('returns one chunk holding everything when size is >= the array length', () => {
      expect(chunkArray(['a', 'b'], 5)).toEqual([['a', 'b']]);
    });

    it('returns an empty array of chunks for an empty input', () => {
      expect(chunkArray([], 5)).toEqual([]);
    });

    it('does not mutate the source array', () => {
      const source = [1, 2, 3];
      chunkArray(source, 2);
      expect(source).toEqual([1, 2, 3]);
    });

    it('degenerates to a single chunk for a non-positive size instead of looping forever', () => {
      expect(chunkArray([1, 2, 3], 0)).toEqual([[1, 2, 3]]);
      expect(chunkArray([1, 2, 3], -1)).toEqual([[1, 2, 3]]);
    });
  });
});

describe('formatTimeOfDay', () => {
  it('formats 24-hour times with zero padding', () => {
    expect(formatTimeOfDay(new Date(2026, 6, 18, 18, 20))).toBe('18:20');
    expect(formatTimeOfDay(new Date(2026, 6, 18, 9, 5), '24h')).toBe('09:05');
    expect(formatTimeOfDay(new Date(2026, 6, 18, 0, 0), '24h')).toBe('00:00');
  });

  it('formats 12-hour times with am/pm and no leading zero', () => {
    expect(formatTimeOfDay(new Date(2026, 6, 18, 18, 20), '12h')).toBe(
      '6:20pm'
    );
    expect(formatTimeOfDay(new Date(2026, 6, 18, 0, 5), '12h')).toBe('12:05am');
    expect(formatTimeOfDay(new Date(2026, 6, 18, 12, 0), '12h')).toBe(
      '12:00pm'
    );
    expect(formatTimeOfDay(new Date(2026, 6, 18, 9, 30), '12h')).toBe('9:30am');
  });
});

describe('secondsUntilKickOff', () => {
  it('returns the whole seconds remaining until a later kick-off time today', () => {
    const now = new Date(2026, 6, 18, 19, 44, 0, 0);
    expect(secondsUntilKickOff('19:45', now)).toBe(60);
  });

  it('rounds up so a consumer ticking once a second never reads 0 early', () => {
    const now = new Date(2026, 6, 18, 19, 44, 30, 500);
    expect(secondsUntilKickOff('19:45', now)).toBe(30);
  });

  it('returns null once the kick-off time has passed today (no next-day rollover)', () => {
    const now = new Date(2026, 6, 18, 19, 45, 1, 0);
    expect(secondsUntilKickOff('19:45', now)).toBeNull();
  });

  it('returns null exactly at kick-off (0 is not a positive countdown)', () => {
    const now = new Date(2026, 6, 18, 19, 45, 0, 0);
    expect(secondsUntilKickOff('19:45', now)).toBeNull();
  });

  it('handles the midnight kick-off edge: 00:00 counts as already past once any time has elapsed today', () => {
    const now = new Date(2026, 6, 18, 0, 0, 1, 0);
    expect(secondsUntilKickOff('00:00', now)).toBeNull();
  });

  it('handles the midnight kick-off edge: 23:59 stays reachable right up to the last second', () => {
    const now = new Date(2026, 6, 18, 23, 58, 59, 0);
    expect(secondsUntilKickOff('23:59', now)).toBe(1);
  });

  it('accepts a single-digit hour', () => {
    const now = new Date(2026, 6, 18, 8, 59, 0, 0);
    expect(secondsUntilKickOff('9:00', now)).toBe(60);
  });

  it('returns null for garbage or malformed input', () => {
    const now = new Date(2026, 6, 18, 12, 0, 0, 0);
    expect(secondsUntilKickOff('', now)).toBeNull();
    expect(secondsUntilKickOff('not a time', now)).toBeNull();
    expect(secondsUntilKickOff('25:00', now)).toBeNull();
    expect(secondsUntilKickOff('12:60', now)).toBeNull();
    expect(secondsUntilKickOff('12:5', now)).toBeNull();
    expect(secondsUntilKickOff('12:05:00', now)).toBeNull();
    expect(secondsUntilKickOff('12', now)).toBeNull();
  });
});
