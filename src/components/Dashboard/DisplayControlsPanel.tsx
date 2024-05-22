import { CustomScreen, MatchSettings } from 'src/types';
import ButtonGrid from '../ButtonGrid/ButtonGrid';
import CollapsiblePanel from '../CollapsiblePanel/CollapsiblePanel';
import { useEffect, useState } from 'react';

export interface Props {
  updateMatchSettings: (settingsUpdated: Partial<MatchSettings>) => void;
  matchSettings: MatchSettings;
}

export default function DisplayControlsPanel({
  updateMatchSettings,
  matchSettings,
}: Props) {
  const [customScreens, setCustomScreens] = useState<CustomScreen[]>([]);

  useEffect(() => {
    const fetchScreens = async () => {
      try {
        const storedScreens = await window?.electronAPI?.getCustomScreens();
        setCustomScreens(storedScreens || []);
        console.log('storedScreens', storedScreens);
      } catch (error) {
        console.error('Failed to fetch custom screens:', error);
      }
    };

    fetchScreens();

    const unsubscribe = window?.electronAPI?.onCustomScreensUpdated(
      (updatedScreens) => {
        console.log('updatedScreens', updatedScreens); // Should now log the correct array
        setCustomScreens(updatedScreens || []);
      }
    );

    // Clean up the listener on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <CollapsiblePanel title="Display Controls">
      <ButtonGrid
        className="mb-4"
        buttons={[
          {
            label: 'None',
            onClick: () =>
              updateMatchSettings({
                displayScreen: 'none',
                customScreenImageUrl: undefined,
              }),
            selected: matchSettings.displayScreen === 'none',
          },
          {
            label: 'Match title',
            onClick: () =>
              updateMatchSettings({
                displayScreen: 'matchTitle',
                customScreenImageUrl: undefined,
              }),
            selected: matchSettings.displayScreen === 'matchTitle',
          },
          {
            label: 'Score Bug',
            onClick: () =>
              updateMatchSettings({
                displayScreen: 'scoreBug',
                customScreenImageUrl: undefined,
              }),
            selected: matchSettings.displayScreen === 'scoreBug',
          },
          {
            label: 'Penalties',
            onClick: () =>
              updateMatchSettings({
                displayScreen: 'penalties',
                customScreenImageUrl: undefined,
              }),
            selected: matchSettings.displayScreen === 'penalties',
          },
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
