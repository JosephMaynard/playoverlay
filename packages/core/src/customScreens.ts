import { CustomScreen, MatchState } from './types';

// A graphic's identity is its image file, not its title: the operator can
// rename a graphic (or edit its screen links) while it is on air, and the
// active copy in matchState.overlays must still be recognised as the same
// graphic. Entries saved without a file path fall back to the URL, then the
// title.
export function customScreenKey(screen: CustomScreen): string {
  return screen.filePath ?? screen.url ?? screen.title;
}

export function addCustomScreen(
  customScreens: CustomScreen[],
  newScreen: CustomScreen
): CustomScreen[] {
  const key = customScreenKey(newScreen);
  const exists = customScreens.some(
    (screen) => customScreenKey(screen) === key
  );

  if (!exists) {
    return [...customScreens, newScreen];
  }

  return customScreens;
}

export function removeCustomScreen(
  customScreens: CustomScreen[],
  targetScreen: CustomScreen
): CustomScreen[] {
  const key = customScreenKey(targetScreen);
  return customScreens.filter((screen) => customScreenKey(screen) !== key);
}

// Brings the active overlays in line with the graphics library after it
// changes (or after an undo restores an older overlay list): each active
// overlay takes the library's current title and screen links, and one that
// was deleted or turned into a full-screen graphic comes off air. Returns
// null when nothing changed, so a caller can skip a redundant store write.
export function reconcileActiveOverlays(
  activeOverlays: CustomScreen[],
  library: CustomScreen[]
): CustomScreen[] | null {
  const libraryOverlays = new Map(
    library
      .filter((graphic) => graphic.type === 'overlay')
      .map((graphic) => [customScreenKey(graphic), graphic])
  );
  const reconciled = activeOverlays.flatMap((overlay) => {
    const current = libraryOverlays.get(customScreenKey(overlay));
    return current ? [current] : [];
  });

  const unchanged =
    reconciled.length === activeOverlays.length &&
    reconciled.every(
      (overlay, index) =>
        JSON.stringify(overlay) === JSON.stringify(activeOverlays[index])
    );
  return unchanged ? null : reconciled;
}

// The full-screen counterpart of reconcileActiveOverlays: a custom graphic
// that is on air full-screen but has since been deleted, or turned into an
// overlay, is taken off air (back to the score bug) instead of leaving a
// missing image on the display and OBS with no dashboard button selected.
// Returns the matchState update to apply, or null when nothing changed.
export function reconcileActiveScreen(
  matchState: MatchState,
  library: CustomScreen[]
): Partial<MatchState> | null {
  if (matchState.displayScreen !== 'custom') return null;
  const stillAScreen = library.some(
    (graphic) =>
      (graphic.type === undefined || graphic.type === 'screen') &&
      (graphic.url ?? undefined) === matchState.customScreenImageUrl
  );
  return stillAScreen
    ? null
    : { displayScreen: 'scoreBug', customScreenImageUrl: undefined };
}
