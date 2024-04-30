import { useState, useEffect } from 'react';
import { Bars3Icon } from '@heroicons/react/24/outline';
import {
  Scores,
  TeamSettingsInterface,
  Time,
  AppSettings,
  MatchSettings,
} from '../../types';

// @ts-ignore
import logo from '../../assets/playoverlay-logo.svg';
import Preview from '../Preview/Preview';
import SettingsMenu from './SettingsMenu';
import ScoresLayout from '../ScoresLayout/ScoresLayout';
import ScoreInput from './ScoreInput';
import MatchTitleLayout from '../MatchTitleLayout/MatchTitleLayout';
import TimeControl from './TimeControl';
import CollapsiblePanel from '../CollapsiblePanel/CollapsiblePanel';
import ButtonGrid from '../ButtonGrid/ButtonGrid';

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

export const defaultAppSettings: AppSettings = {
  keyColour: '#0000FF',
};

export const defaultTeamSettings: TeamSettingsInterface = {
  homeTeamNameFull: 'Home Team',
  homeTeamNameAbbreviated: 'HOM',
  homeTeamTextColour: '#ffffff',
  homeTeamBackgroundColour: '#cc0000',
  awayTeamNameFull: 'Away Team',
  awayTeamNameAbbreviated: 'AWA',
  awayTeamTextColour: '#ffffff',
  awayTeamBackgroundColour: '#0000cc',
};

export const defaultMatchSettings: MatchSettings = {
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
  const [teamSettings, setTeamSettings] =
    useState<TeamSettingsInterface>(defaultTeamSettings);
  const [matchSettings, setMatchSettings] =
    useState<MatchSettings>(defaultMatchSettings);
  const [appSettings, setAppSettings] =
    useState<AppSettings>(defaultAppSettings);
  const [time, setTime] = useState<Time>({ paused: false });
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    window?.electronAPI?.updateScores(scores);
    window?.electronAPI?.updateMatchSettings(matchSettings);
    window?.electronAPI?.updateTime(time);
    window?.electronAPI?.startPowerSaveBlocker();

    window?.electronAPI
      ?.getTeamSettings()
      .then((settings) => {
        setTeamSettings(settings);
        window?.electronAPI?.updateTeamSettings(settings);
        console.log('Team Settings: ', settings);
      })
      .catch((error: any) => {
        window?.electronAPI?.updateTeamSettings(teamSettings);
        console.error('Failed to load team settings:', error);
      });

    window?.electronAPI
      ?.getAppSettings()
      .then((settings) => {
        setAppSettings(settings);
        window?.electronAPI?.updateAppSettings(settings);
        console.log('App Settings: ', settings);
      })
      .catch((error: any) => {
        window?.electronAPI?.updateAppSettings(appSettings);
        console.error('Failed to load app settings:', error);
      });

    return () => {
      window?.electronAPI?.stopPowerSaveBlocker();
    };
  }, []);

  const updateScore = (scoreUpdates: Partial<Scores>) => {
    const updatedScores = {
      ...scores,
      ...scoreUpdates,
    };
    setScores(updatedScores);
    window?.electronAPI?.updateScores(updatedScores);
  };

  const updateTeamSettings = (
    settingsUpdated: Partial<TeamSettingsInterface>
  ) => {
    const updatedSettings = {
      ...teamSettings,
      ...settingsUpdated,
    };
    setTeamSettings(updatedSettings);
    window?.electronAPI?.updateTeamSettings(updatedSettings);
  };

  const updateMatchSettings = (settingsUpdated: Partial<MatchSettings>) => {
    const updatedSettings = {
      ...matchSettings,
      ...settingsUpdated,
    };
    setMatchSettings(updatedSettings);
    window?.electronAPI?.updateMatchSettings(updatedSettings);
  };

  const updateAppSettings = (settingsUpdated: Partial<AppSettings>) => {
    const updatedSettings = {
      ...appSettings,
      ...settingsUpdated,
    };
    setAppSettings(updatedSettings);
    window?.electronAPI?.updateAppSettings(updatedSettings);
  };

  const incrementTime = () => {
    seconds = seconds + 1;
    setTime((currentTime) => {
      const updatedTime = {
        ...currentTime,
        time: timeToString(seconds),
      };
      window?.electronAPI?.updateTime(updatedTime);
      return updatedTime;
    });
  };

  const startTime = (matchPhase: MatchPhase) => {
    if (interval) {
      clearInterval(interval);
    }
    setPaused(false);
    seconds = matchPhases[matchPhase].start * 60;
    const initialTime = { ...time, time: timeToString(seconds) };
    setTime(initialTime);
    updateMatchSettings({ matchPhase });
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
    updateMatchSettings({ matchPhase: undefined });
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
        teamSettings={teamSettings}
        updateTeamSettings={updateTeamSettings}
        appSettings={appSettings}
        updateAppSettings={updateAppSettings}
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

      <main className="grid grid-cols-1 lg:grid-cols-2">
        <div>
          <Preview keyColour={appSettings.keyColour}>
            <ScoresLayout
              settings={teamSettings}
              scores={scores}
              time={time}
              active={matchSettings.displayScreen === 'scoreBug'}
            />
            <MatchTitleLayout
              settings={teamSettings}
              scores={scores}
              time={time}
              active={matchSettings.displayScreen === 'matchTitle'}
            />
          </Preview>

          <div className="p-4">
            <CollapsiblePanel
              title="Display Controls"
              className="mx-auto max-w-4xl"
            >
              <ButtonGrid
                className="mb-4"
                buttons={[
                  {
                    label: 'None',
                    onClick: () =>
                      updateMatchSettings({ displayScreen: 'none' }),
                    selected: matchSettings.displayScreen === 'none',
                  },
                  {
                    label: 'Match title',
                    onClick: () =>
                      updateMatchSettings({ displayScreen: 'matchTitle' }),
                    selected: matchSettings.displayScreen === 'matchTitle',
                  },
                  {
                    label: 'Score Bug',
                    onClick: () =>
                      updateMatchSettings({ displayScreen: 'scoreBug' }),
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
          </div>
        </div>
        <div className="lg:p-4">
          <CollapsiblePanel title="Scores" className="mx-auto max-w-4xl">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ScoreInput
                title="Home Team"
                score={scores.homeTeam}
                id="homeTeamScore"
                setScore={(homeTeam: number) => updateScore({ homeTeam })}
                textColour={teamSettings.homeTeamTextColour}
                backgroundColour={teamSettings.homeTeamBackgroundColour}
                teamName={teamSettings.homeTeamNameAbbreviated}
              />
              <ScoreInput
                title="Away Team"
                score={scores.awayTeam}
                id="awayTeamScore"
                setScore={(awayTeam: number) => updateScore({ awayTeam })}
                textColour={teamSettings.awayTeamTextColour}
                backgroundColour={teamSettings.awayTeamBackgroundColour}
                teamName={teamSettings.awayTeamNameAbbreviated}
              />
            </div>
          </CollapsiblePanel>

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
              setTime({
                ...time,
                additionalTime: additionalTime || undefined,
              })
            }
            startTime={startTime}
            stopTime={stopTime}
            matchPhase={matchSettings.matchPhase}
          />
        </div>
      </main>
    </div>
  );
}
