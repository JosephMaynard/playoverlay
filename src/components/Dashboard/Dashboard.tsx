import { Fragment, useState } from 'react';
import {
  Bars3Icon,
  XMarkIcon,
  Cog8ToothIcon,
} from '@heroicons/react/24/outline';
import { Dialog, Transition } from '@headlessui/react';
import ColourPicker from '../ColorPicker/ColorPicker';
import { Scores, Settings, Time } from '../../types';

// @ts-ignore
import logo from '../../assets/playoverlay-logo.svg';
import Preview from '../Preview/Preview';
import SettingsMenu from './SettingsMenu';
import ScoresLayout from '../ScoresLayout/ScoresLayout';
import ScoreInput from './ScoreInput';

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

const navigation = [
  { name: 'Settings', href: '#', icon: Cog8ToothIcon, current: true },
];

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [scores, setScores] = useState<Scores>({ homeTeam: 0, awayTeam: 0 });
  const [settings, setSettings] = useState<Settings>({
    keyColour: '#0000FF',
    homeTeamName: 'HOM',
    homeTeamTextColour: '#ffffff',
    homeTeamBackgroundColour: '#cc0000',
    awayTeamName: 'AWA',
    awayTeamTextColour: '#ffffff',
    awayTeamBackgroundColour: '#0000cc',
  });
  const [time, setTime] = useState<Time>({ time: '0:00' });

  const updateScore = (updatedScores: Partial<Scores>) => {
    setScores({
      ...scores,
      ...updatedScores,
    });
  };

  const updateSettings = (updatedSettings: Partial<Settings>) => {
    setSettings({
      ...settings,
      ...updatedSettings,
    });

    (window as any).api.send('settings-update', settings);
  };

  return (
    <div>
      <SettingsMenu
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        settings={settings}
        updateSettings={updateSettings}
      />
      <div className="sticky top-0 z-40 flex items-center justify-between bg-white px-4 py-4 shadow-sm sm:px-6">
        <div className="flex  items-center gap-x-4">
          <img className="h-7 w-auto" src={logo} alt="PlayOverlay logo" />
          <div className="flex-1 text-sm font-semibold leading-6 text-gray-900">
            PlayOverlay
          </div>
        </div>
        <button
          type="button"
          className="-m-2.5 p-2.5 text-gray-700"
          onClick={() => setSidebarOpen(true)}
        >
          <span className="sr-only">Open sidebar</span>
          <Bars3Icon className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>

      <Preview keyColour={settings.keyColour}>
        <ScoresLayout settings={settings} scores={scores} time={time} />
      </Preview>
      <main className="py-10 ">
        <div className="mx-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ScoreInput
            title="Home Team"
            score={scores.homeTeam}
            id="homeTeamScore"
            setScore={(homeTeam: number) => updateScore({ homeTeam })}
          />
          <ScoreInput
            title="Away Team"
            score={scores.awayTeam}
            id="awayTeamScore"
            setScore={(awayTeam: number) => updateScore({ awayTeam })}
          />
        </div>
      </main>
    </div>
  );
}
