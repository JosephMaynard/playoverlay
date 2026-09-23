import { useTranslation } from 'react-i18next';
import { CustomScreen, MatchState } from 'src/types';
import ButtonGrid from '../ButtonGrid/ButtonGrid';
import CollapsiblePanel from '../CollapsiblePanel/CollapsiblePanel';
import { DisplayScreen, screens } from '../../constants';
import { MatchSettings } from 'src/zodSchemas';

// Local i18n key map (rather than translating the `screens` constant
// directly): the same approach as SystemSettingsMenu's Stream Deck screen
// buttons and EditCustomScreen's overlay-screen checkboxes, so all three
// surfaces show the same translated label for a given screen.
const screenLabelKeys: Record<DisplayScreen, string> = {
  none: 'settings:system.screens.none',
  matchTitle: 'settings:system.screens.matchTitle',
  scoreBug: 'settings:system.screens.scoreBug',
  penalties: 'settings:system.screens.penalties',
  custom: 'settings:system.screens.custom',
  endScreen: 'settings:system.screens.endScreen',
  scoreboard: 'settings:system.screens.scoreboard',
};

export interface Props {
  // Overlay toggles go through updateMatchState (not individually undoable).
  updateMatchState: (settingsUpdated: Partial<MatchState>) => void;
  // On-air screen switches go through switchScreen, which records an undo
  // entry before applying the change.
  switchScreen: (settingsUpdated: Partial<MatchState>) => void;
  matchState: MatchState;
  customGraphics: CustomScreen[];
  matchSettings: MatchSettings;
}

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

export default function DisplayControlsPanel({
  updateMatchState,
  switchScreen,
  matchState,
  customGraphics,
  matchSettings,
}: Props) {
  const { t } = useTranslation();
  const customScreens = customGraphics.filter(
    (graphic) => graphic.type === undefined || graphic.type === 'screen'
  );
  const overlays = customGraphics.filter(
    (graphic) => graphic.type === 'overlay'
  );
  return (
    <CollapsiblePanel title={t('dashboard:displayControls.title')}>
      <ButtonGrid
        buttons={[
          ...Object.keys(screens)
            .filter((screen) => screen !== 'custom')
            .filter(
              (screen) =>
                matchSettings.hasPenalties !== false || screen !== 'penalties'
            )
            .map((screen) => ({
              label: t(screenLabelKeys[screen as DisplayScreen]),
              onClick: () =>
                switchScreen({
                  displayScreen: screen as DisplayScreen,
                  customScreenImageUrl: undefined,
                }),
              selected: matchState.displayScreen === screen,
            })),
        ]}
      />
      {customScreens?.length > 0 && (
        <>
          <div className="my-4 border-b border-gray-200 pb-2">
            <h3 className="text-base font-semibold leading-6 text-gray-900">
              {t('settings:system.screens.custom')}
            </h3>
          </div>
          <ButtonGrid
            buttons={customScreens?.map((customScreen) => ({
              label: customScreen.title,
              onClick: () =>
                switchScreen({
                  displayScreen: 'custom',
                  customScreenImageUrl: customScreen.url ?? undefined,
                }),
              selected:
                matchState.displayScreen === 'custom' &&
                matchState.customScreenImageUrl ===
                  (customScreen.url ?? undefined),
            }))}
          />
        </>
      )}
      {overlays?.length > 0 && (
        <>
          <div className="my-4 border-b border-gray-200 pb-2">
            <h3 className="text-base font-semibold leading-6 text-gray-900">
              {t('dashboard:displayControls.overlays')}
            </h3>
          </div>
          <ButtonGrid
            buttons={overlays?.map((customScreen) => {
              const selected = (matchState.overlays || []).some(
                (activeOverlay) =>
                  customScreenKey(activeOverlay) ===
                  customScreenKey(customScreen)
              );
              return {
                label: customScreen.title,
                onClick: () =>
                  updateMatchState({
                    overlays: selected
                      ? removeCustomScreen(matchState.overlays, customScreen)
                      : addCustomScreen(matchState.overlays, customScreen),
                  }),
                selected,
              };
            })}
          />
        </>
      )}
    </CollapsiblePanel>
  );
}
