import { useState, useEffect } from 'react';
import { Bars3Icon } from '@heroicons/react/24/outline';
import { Scores, Settings, Time } from '../../types';

// @ts-ignore
import logo from '../../assets/playoverlay-logo.svg';
import Preview from '../Preview/Preview';
import SettingsMenu from './SettingsMenu';
import ScoresLayout from '../ScoresLayout/ScoresLayout';
import ScoreInput from './ScoreInput';

export const times = {
  firstHalf: {
    title: 'First Half',
    start: 0,
    end: 45,
  },
  secondHalf: {
    title: 'Second Half',
    start: 45,
    end: 90,
  },
  extraTimeFirstHalf: {
    title: 'Extra Time First Half',
    start: 90,
    end: 105,
  },
  extraTimeSecondHalf: {
    title: 'Extra Time Second Half',
    start: 105,
    end: 120,
  },
};

let seconds: number = 0;

export const timeToString = (timeInSeconds: number) => {
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

let interval: ReturnType<typeof setInterval>;

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
  const [time, setTime] = useState<Time>({});

  useEffect(() => {
    window.electronAPI.updateScores(scores);
    window.electronAPI.updateSettings(settings);
    window.electronAPI.updateTime(time);
  }, []);

  const updateScore = (scoreUpdates: Partial<Scores>) => {
    const updatedScores = {
      ...scores,
      ...scoreUpdates,
    };
    setScores(updatedScores);
    window.electronAPI.updateScores(updatedScores);
  };

  const updateSettings = (settingsUpdated: Partial<Settings>) => {
    const updatedSettings = {
      ...settings,
      ...settingsUpdated,
    };
    setSettings(updatedSettings);
    window.electronAPI.updateSettings(updatedSettings);
  };

  const startTime = (
    period:
      | 'firstHalf'
      | 'secondHalf'
      | 'extraTimeFirstHalf'
      | 'extraTimeSecondHalf'
  ) => {
    if (interval) {
      clearInterval(interval);
    }
    seconds = times[period].start * 60;
    const initialTime = { ...time, time: timeToString(seconds) };
    setTime(initialTime);
    window.electronAPI.updateTime(initialTime);
    interval = setInterval(() => {
      seconds = seconds + 1;
      const updatedTime = { ...time, time: timeToString(seconds) };
      setTime(updatedTime);
      window.electronAPI.updateTime(updatedTime);
    }, 1000);
  };

  const stopTime = () => {
    if (interval) {
      clearInterval(interval);
    }
    setTime({ ...time, time: undefined });
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
      <main className="p-4">
        <div className="mx-auto mb-4 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
          <ScoreInput
            title="Home Team"
            score={scores.homeTeam}
            id="homeTeamScore"
            setScore={(homeTeam: number) => updateScore({ homeTeam })}
            textColour={settings.homeTeamTextColour}
            backgroundColour={settings.homeTeamBackgroundColour}
            teamName={settings.homeTeamName}
          />
          <ScoreInput
            title="Away Team"
            score={scores.awayTeam}
            id="awayTeamScore"
            setScore={(awayTeam: number) => updateScore({ awayTeam })}
            textColour={settings.awayTeamTextColour}
            backgroundColour={settings.awayTeamBackgroundColour}
            teamName={settings.awayTeamName}
          />
        </div>
        <div className="mx-auto grid max-w-2xl">
          <span className="isolate inline-flex rounded-md shadow-sm">
            <button
              type="button"
              className="relative inline-flex items-center rounded-l-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10"
              onClick={() => startTime('firstHalf')}
            >
              First Half
            </button>
            <button
              type="button"
              className="relative -ml-px inline-flex items-center bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10"
              onClick={() => startTime('secondHalf')}
            >
              Second Half
            </button>
            <button
              type="button"
              className="relative -ml-px inline-flex items-center bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10"
              onClick={() => startTime('extraTimeFirstHalf')}
            >
              Extra Time First Half
            </button>
            <button
              type="button"
              className="relative -ml-px inline-flex items-center bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10"
              onClick={() => startTime('extraTimeSecondHalf')}
            >
              Extra Time Second Half
            </button>
            <button
              type="button"
              className="relative -ml-px inline-flex items-center rounded-r-md bg-red-700 px-3 py-2 text-sm font-semibold text-white ring-1 ring-inset ring-gray-300 hover:bg-red-900 focus:z-10"
              onClick={() => stopTime()}
            >
              Stop
            </button>
          </span>
        </div>
      </main>
    </div>
  );
}
