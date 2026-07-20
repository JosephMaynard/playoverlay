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
  updateMatchState: (settingsUpdated: Partial<MatchState>) => void;
  matchState: MatchState;
  customGraphics: CustomScreen[];
  matchSettings: MatchSettings;
}

export function addCustomScreen(
  customScreens: CustomScreen[],
  newScreen: CustomScreen
): CustomScreen[] {
  const exists = customScreens.some(
    (screen) =>
      screen.title === newScreen.title && screen.filePath === newScreen.filePath
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
  return customScreens.filter(
    (screen) =>
      !(
        screen.title === targetScreen.title &&
        screen.filePath === targetScreen.filePath
      )
  );
}

export default function DisplayControlsPanel({
  updateMatchState,
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
                updateMatchState({
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
                updateMatchState({
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
              const selected = (matchState.overlays || [])
                .map((selectOvelay) => selectOvelay.filePath)
                .includes(customScreen.filePath);
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
