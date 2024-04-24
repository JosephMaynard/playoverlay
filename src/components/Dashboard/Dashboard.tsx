import { useState, useEffect } from 'react';
import { Bars3Icon } from '@heroicons/react/24/outline';
import { Scores, Settings, Time } from '../../types';

// @ts-ignore
import logo from '../../assets/playoverlay-logo.svg';
import Preview from '../Preview/Preview';
import SettingsMenu from './SettingsMenu';
import ScoresLayout from '../ScoresLayout/ScoresLayout';
import ScoreInput from './ScoreInput';
import MatchTitleLayout from '../MatchTitleLayout/MatchTitleLayout';
import TimeControl from './TimeControl';

export const matchPhases = {
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
} as const;

export type MatchPhase = keyof typeof matchPhases;

export const defaultSettings: Settings = {
  keyColour: '#0000FF',
  homeTeamNameFull: 'Home Team',
  homeTeamNameAbbreviated: 'HOM',
  homeTeamTextColour: '#ffffff',
  homeTeamBackgroundColour: '#cc0000',
  awayTeamNameFull: 'Away Team',
  awayTeamNameAbbreviated: 'AWA',
  awayTeamTextColour: '#ffffff',
  awayTeamBackgroundColour: '#0000cc',
  displayScreen: 'scoreBug',
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
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [time, setTime] = useState<Time>({ paused: false });
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    window?.electronAPI?.updateScores(scores);
    window?.electronAPI?.updateSettings(settings);
    window?.electronAPI?.updateTime(time);
  }, []);

  const updateScore = (scoreUpdates: Partial<Scores>) => {
    const updatedScores = {
      ...scores,
      ...scoreUpdates,
    };
    setScores(updatedScores);
    window?.electronAPI?.updateScores(updatedScores);
  };

  const updateSettings = (settingsUpdated: Partial<Settings>) => {
    const updatedSettings = {
      ...settings,
      ...settingsUpdated,
    };
    setSettings(updatedSettings);
    window?.electronAPI?.updateSettings(updatedSettings);
  };

  const incrementTime = () => {
    seconds = seconds + 1;
    const updatedTime = { ...time, time: timeToString(seconds) };
    setTime((currentTime) => ({ ...currentTime, time: timeToString(seconds) }));
    window?.electronAPI?.updateTime(updatedTime);
  };

  const startTime = (matchPhase: MatchPhase) => {
    if (interval) {
      clearInterval(interval);
    }
    setPaused(false);
    seconds = matchPhases[matchPhase].start * 60;
    const initialTime = { ...time, time: timeToString(seconds) };
    setTime(initialTime);
    updateSettings({ matchPhase });
    window?.electronAPI?.updateTime(initialTime);
    interval = setInterval(incrementTime, 1000);
  };

  const stopTime = () => {
    if (interval) {
      clearInterval(interval);
    }
    const updatedTime: Time = {
      ...time,
      time: undefined,
      additionalTime: undefined,
    };
    setPaused(false);
    setTime(updatedTime);
    updateSettings({ matchPhase: undefined });
    window?.electronAPI?.updateTime(updatedTime);
  };

  const pause = () => {
    if (interval) {
      clearInterval(interval);
      setPaused(true);
    }
  };

  const resume = () => {
    interval = setInterval(incrementTime, 1000);
    setPaused(false);
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
        <ScoresLayout
          settings={settings}
          scores={scores}
          time={time}
          active={settings.displayScreen === 'scoreBug'}
        />
        <MatchTitleLayout
          settings={settings}
          scores={scores}
          time={time}
          active={settings.displayScreen === 'matchTitle'}
        />
      </Preview>
      <main className="p-4">
        <div className="mx-auto mb-4 max-w-2xl ">
          <span className="isolate inline-flex rounded-md shadow-sm">
            <button
              type="button"
              className={`relative inline-flex items-center rounded-l-md ${settings.displayScreen === 'none' ? 'bg-green-300' : 'bg-white hover:bg-gray-50'} px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 focus:z-10`}
              onClick={() => updateSettings({ displayScreen: 'none' })}
            >
              None
            </button>
            <button
              type="button"
              className={`relative -ml-px inline-flex items-center ${settings.displayScreen === 'matchTitle' ? 'bg-green-300' : 'bg-white hover:bg-gray-50'} px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 focus:z-10`}
              onClick={() => updateSettings({ displayScreen: 'matchTitle' })}
            >
              Match title
            </button>
            <button
              type="button"
              className={`relative -ml-px inline-flex items-center rounded-r-md ${settings.displayScreen === 'scoreBug' ? 'bg-green-300' : 'bg-white hover:bg-gray-50'} px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 focus:z-10`}
              onClick={() => updateSettings({ displayScreen: 'scoreBug' })}
            >
              Score Bug
            </button>
          </span>
        </div>
        <div className="mx-auto mb-4 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
          <ScoreInput
            title="Home Team"
            score={scores.homeTeam}
            id="homeTeamScore"
            setScore={(homeTeam: number) => updateScore({ homeTeam })}
            textColour={settings.homeTeamTextColour}
            backgroundColour={settings.homeTeamBackgroundColour}
            teamName={settings.homeTeamNameAbbreviated}
          />
          <ScoreInput
            title="Away Team"
            score={scores.awayTeam}
            id="awayTeamScore"
            setScore={(awayTeam: number) => updateScore({ awayTeam })}
            textColour={settings.awayTeamTextColour}
            backgroundColour={settings.awayTeamBackgroundColour}
            teamName={settings.awayTeamNameAbbreviated}
          />
        </div>
        <div className="mx-auto mb-4 grid max-w-2xl">
          <span className="isolate inline-flex rounded-md shadow-sm">
            <button
              type="button"
              className={`relative inline-flex items-center rounded-l-md  ${settings.matchPhase === 'firstHalf' ? 'bg-green-300' : 'bg-white hover:bg-gray-50'}  ring-gray-30 px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset focus:z-10`}
              onClick={() => startTime('firstHalf')}
            >
              First Half
            </button>
            <button
              type="button"
              className={`relative -ml-px inline-flex items-center  ${settings.matchPhase === 'secondHalf' ? 'bg-green-300' : 'bg-white hover:bg-gray-50'}  ring-gray-30 px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset focus:z-10`}
              onClick={() => startTime('secondHalf')}
            >
              Second Half
            </button>
            <button
              type="button"
              className={`relative -ml-px inline-flex items-center  ${settings.matchPhase === 'extraTimeFirstHalf' ? 'bg-green-300' : 'bg-white hover:bg-gray-50'}  ring-gray-30 px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset focus:z-10`}
              onClick={() => startTime('extraTimeFirstHalf')}
            >
              Extra Time First Half
            </button>
            <button
              type="button"
              className={`relative -ml-px inline-flex items-center  ${settings.matchPhase === 'extraTimeSecondHalf' ? 'bg-green-300' : 'bg-white hover:bg-gray-50'}  ring-gray-30 px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset focus:z-10`}
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

        <div className="mx-auto max-w-2xl">
          <TimeControl
            time={time}
            pause={pause}
            resume={resume}
            adjustTime={(difference: number) => {
              seconds = Math.max(seconds + difference - 1, -1);
              incrementTime();
            }}
            isPaused={paused}
            setAdditionalTime={(additionalTime: number) =>
              setTime({ ...time, additionalTime: additionalTime || undefined })
            }
          />
          <button
            type="button"
            className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            onClick={() => window.electronAPI.toggleFullscreen()}
          >
            Toggle Fullscreen
          </button>
        </div>
      </main>
    </div>
  );
}
