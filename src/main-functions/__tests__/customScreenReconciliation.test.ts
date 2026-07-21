import { describe, expect, it, vi } from 'vitest';
import { CustomScreen, MatchState } from '../../types';
import { defaultMatchState } from '../../constants';
import {
  reconcileCustomScreens,
  reconcileMatchStateScreen,
} from '../customScreenReconciliation';

function screen(overrides: Partial<CustomScreen> = {}): CustomScreen {
  return {
    title: 'Sponsor',
    filePath: '/images/sponsor.png',
    url: 'file:///images/sponsor.png',
    type: 'screen',
    overlayLinks: [],
    ...overrides,
  };
}

describe('reconcileCustomScreens', () => {
  it('keeps every entry when all backing files exist', () => {
    const fileExists = vi.fn(() => true);
    const screens = [screen(), screen({ filePath: '/images/other.png' })];

    const result = reconcileCustomScreens(screens, fileExists);

    expect(result.kept).toEqual(screens);
    expect(result.dropped).toEqual([]);
  });

  it('drops entries whose backing file is missing, keeping the rest', () => {
    const present = screen({ filePath: '/images/present.png' });
    const missing = screen({ filePath: '/images/missing.png' });
    const fileExists = (filePath: string) => filePath === present.filePath;

    const result = reconcileCustomScreens([present, missing], fileExists);

    expect(result.kept).toEqual([present]);
    expect(result.dropped).toEqual([missing]);
  });

  it('keeps an entry with no filePath at all, there is nothing to check on disk', () => {
    const noFile = screen({ filePath: null });
    const fileExists = vi.fn(() => false);

    const result = reconcileCustomScreens([noFile], fileExists);

    expect(result.kept).toEqual([noFile]);
    expect(result.dropped).toEqual([]);
    expect(fileExists).not.toHaveBeenCalled();
  });

  it('returns empty kept/dropped for an empty list', () => {
    const result = reconcileCustomScreens([], vi.fn());

    expect(result.kept).toEqual([]);
    expect(result.dropped).toEqual([]);
  });
});

describe('reconcileMatchStateScreen', () => {
  function matchState(overrides: Partial<MatchState> = {}): MatchState {
    return {
      displayScreen: 'custom',
      penaltiesFirstTeam: 'home',
      customScreenImageUrl: 'file:///images/sponsor.png',
      overlays: [],
      ...overrides,
    };
  }

  it('falls back to scoreBug when the selected custom screen no longer exists', () => {
    const state = matchState();

    const result = reconcileMatchStateScreen(state, []);

    expect(result.displayScreen).toBe(defaultMatchState.displayScreen);
    expect(result.customScreenImageUrl).toBeUndefined();
  });

  it('keeps the selection when the referenced custom screen still exists', () => {
    const url = 'file:///images/sponsor.png';
    const surviving = screen({ url });
    const state = matchState({ customScreenImageUrl: url });

    const result = reconcileMatchStateScreen(state, [surviving]);

    expect(result).toBe(state);
  });

  it('leaves non-custom screens untouched regardless of the custom screens list', () => {
    const state = matchState({
      displayScreen: 'scoreBug',
      customScreenImageUrl: undefined,
    });

    const result = reconcileMatchStateScreen(state, []);

    expect(result).toBe(state);
  });
});
