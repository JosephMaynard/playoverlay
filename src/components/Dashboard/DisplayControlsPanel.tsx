import { CustomScreen, MatchSettings } from 'src/types';
import ButtonGrid from '../ButtonGrid/ButtonGrid';
import CollapsiblePanel from '../CollapsiblePanel/CollapsiblePanel';
import { DisplayScreen, screens } from '../../constants';

export interface Props {
  updateMatchSettings: (settingsUpdated: Partial<MatchSettings>) => void;
  matchSettings: MatchSettings;
  customGraphics: CustomScreen[];
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
  updateMatchSettings,
  matchSettings,
  customGraphics,
}: Props) {
  const customScreens = customGraphics.filter(
    (graphic) => graphic.type === undefined || graphic.type === 'screen'
  );
  const overlays = customGraphics.filter(
    (graphic) => graphic.type === 'overlay'
  );
  return (
    <CollapsiblePanel title="Display Controls">
      <ButtonGrid
        buttons={[
          ...Object.keys(screens)
            .filter((screen) => screen !== 'custom')
            .map((screen) => ({
              label: screens[screen as DisplayScreen],
              onClick: () =>
                updateMatchSettings({
                  displayScreen: screen as DisplayScreen,
                  customScreenImageUrl: undefined,
                }),
              selected: matchSettings.displayScreen === screen,
            })),
        ]}
      />
      {customScreens?.length > 0 && (
        <>
          <div className="my-4 border-b border-gray-200 pb-2">
            <h3 className="text-base font-semibold leading-6 text-gray-900">
              Custom Screens
            </h3>
          </div>
          <ButtonGrid
            buttons={customScreens?.map((customScreen) => ({
              label: customScreen.title,
              onClick: () =>
                updateMatchSettings({
                  displayScreen: 'custom',
                  customScreenImageUrl: customScreen.url,
                }),
              selected: matchSettings.customScreenImageUrl === customScreen.url,
            }))}
          />
        </>
      )}
      {overlays?.length > 0 && (
        <>
          <div className="my-4 border-b border-gray-200 pb-2">
            <h3 className="text-base font-semibold leading-6 text-gray-900">
              Overlays
            </h3>
          </div>
          <ButtonGrid
            buttons={overlays?.map((customScreen) => {
              const selected = (matchSettings.overlays || [])
                .map((selectOvelay) => selectOvelay.filePath)
                .includes(customScreen.filePath);
              return {
                label: customScreen.title,
                onClick: () =>
                  updateMatchSettings({
                    overlays: selected
                      ? removeCustomScreen(matchSettings.overlays, customScreen)
                      : addCustomScreen(matchSettings.overlays, customScreen),
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
