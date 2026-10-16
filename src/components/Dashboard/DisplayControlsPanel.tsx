import { useTranslation } from 'react-i18next';
import {
  CustomScreen,
  MatchState,
  DisplayScreen,
  screens,
  MatchSettings,
  customScreenKey,
  addCustomScreen,
  removeCustomScreen,
} from '@playoverlay/core';
import ButtonGrid from '../ButtonGrid/ButtonGrid';
import CollapsiblePanel from '../CollapsiblePanel/CollapsiblePanel';

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
