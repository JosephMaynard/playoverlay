import { MatchSettings } from 'src/types';
import ButtonGrid from '../ButtonGrid/ButtonGrid';
import CollapsiblePanel from '../CollapsiblePanel/CollapsiblePanel';

export interface Props {
  updateMatchSettings: (settingsUpdated: Partial<MatchSettings>) => void;
  matchSettings: MatchSettings;
}

export default function DisplayControlsPanel({
  updateMatchSettings,
  matchSettings,
}: Props) {
  return (
    <CollapsiblePanel title="Display Controls">
      <ButtonGrid
        className="mb-4"
        buttons={[
          {
            label: 'None',
            onClick: () => updateMatchSettings({ displayScreen: 'none' }),
            selected: matchSettings.displayScreen === 'none',
          },
          {
            label: 'Match title',
            onClick: () => updateMatchSettings({ displayScreen: 'matchTitle' }),
            selected: matchSettings.displayScreen === 'matchTitle',
          },
          {
            label: 'Score Bug',
            onClick: () => updateMatchSettings({ displayScreen: 'scoreBug' }),
            selected: matchSettings.displayScreen === 'scoreBug',
          },
        ]}
      />
    </CollapsiblePanel>
  );
}
