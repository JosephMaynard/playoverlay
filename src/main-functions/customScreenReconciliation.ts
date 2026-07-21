import { CustomScreen, MatchState } from '../types';
import { defaultMatchState } from '../constants';

export interface ReconcileCustomScreensResult {
  kept: CustomScreen[];
  dropped: CustomScreen[];
}

// A custom screen references an image file on disk. The user can delete that
// file outside the app, or move config.json to a machine that never had the
// images folder, either way the app must not go on offering a graphic whose
// backing file is gone. `fileExists` is injected (rather than importing `fs`
// here) so this stays pure and unit-testable without touching the real
// filesystem. Entries with no filePath at all (never produced by the current
// upload flow, but allowed by the CustomScreen type) are always kept, there
// is no file to check.
export function reconcileCustomScreens(
  screens: CustomScreen[],
  fileExists: (filePath: string) => boolean
): ReconcileCustomScreensResult {
  const kept: CustomScreen[] = [];
  const dropped: CustomScreen[] = [];

  for (const screen of screens) {
    if (screen.filePath && !fileExists(screen.filePath)) {
      dropped.push(screen);
    } else {
      kept.push(screen);
    }
  }

  return { kept, dropped };
}

// A persisted matchState can be showing a custom screen (displayScreen ===
// 'custom') whose customScreenImageUrl no longer matches any surviving
// custom screen, e.g. the operator deleted that graphic between sessions.
// Rendering it would leave CustomScreenLayout painting a broken/blank
// background, so fall back to the same scoreBug default a fresh match
// starts on instead. Built-in screens never set customScreenImageUrl, so
// anything other than 'custom' is always left untouched.
export function reconcileMatchStateScreen(
  matchState: MatchState,
  survivingCustomScreens: CustomScreen[]
): MatchState {
  if (matchState.displayScreen !== 'custom') return matchState;

  const stillExists = survivingCustomScreens.some(
    (screen) => screen.url === matchState.customScreenImageUrl
  );
  if (stillExists) return matchState;

  return {
    ...matchState,
    displayScreen: defaultMatchState.displayScreen,
    customScreenImageUrl: undefined,
  };
}
