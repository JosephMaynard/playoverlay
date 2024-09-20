import { useEffect, useState } from 'react';

import { CustomScreen, MatchSettings } from 'src/types';
import ButtonGrid from '../ButtonGrid/ButtonGrid';
import CollapsiblePanel from '../CollapsiblePanel/CollapsiblePanel';
import { DisplayScreen, screens } from '../../constants';

export interface Props {
  updateMatchSettings: (settingsUpdated: Partial<MatchSettings>) => void;
  matchSettings: MatchSettings;
  customGraphics: CustomScreen[];
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
        className="mb-4"
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
        <ButtonGrid
          className="mb-4"
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
      )}
    </CollapsiblePanel>
  );
}
