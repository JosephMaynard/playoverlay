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
    <CollapsiblePanel title="Display Controls" className="mx-auto max-w-4xl">
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
      <button
        type="button"
        className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        onClick={() => window.electronAPI.toggleFullscreen()}
      >
        Toggle Fullscreen
      </button>
    </CollapsiblePanel>
  );
}
