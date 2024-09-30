import { CustomScreen, MatchState } from 'src/types';
import ButtonGrid from '../ButtonGrid/ButtonGrid';
import CollapsiblePanel from '../CollapsiblePanel/CollapsiblePanel';
import { DisplayScreen, screens } from '../../constants';

export interface Props {
  updateMatchState: (settingsUpdated: Partial<MatchState>) => void;
  matchState: MatchState;
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
  updateMatchState,
  matchState,
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
              Custom Screens
            </h3>
          </div>
          <ButtonGrid
            buttons={customScreens?.map((customScreen) => ({
              label: customScreen.title,
              onClick: () =>
                updateMatchState({
                  displayScreen: 'custom',
                  customScreenImageUrl: customScreen.url,
                }),
              selected: matchState.customScreenImageUrl === customScreen.url,
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
