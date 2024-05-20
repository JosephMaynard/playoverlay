import { useState, useEffect } from 'react';
import { Bars3Icon, Cog8ToothIcon } from '@heroicons/react/24/outline';

import {
  Scores,
  TeamSettingsInterface,
  Time,
  AppSettings,
  MatchSettings,
  Penalty,
  homeOrAway,
  DisplayScreen,
} from '../../types';
import Preview from '../Preview/Preview';
import SettingsMenu from './SettingsMenu';
import TimeControlPanel from './TimeControlPanel';
import {
  MatchPhase,
  defaultAppSettings,
  defaultMatchSettings,
  defaultScores,
  defaultTeamSettings,
  matchPhases,
} from '../../constants';
import Screens from '../Screens/Screens';

// @ts-ignore
import logo from '../../assets/playoverlay-logo.svg';
import ScoresPanel from './ScoresPanel';
import DisplayControlsPanel from './DisplayControlsPanel';
import { timeToString } from '../../utils';
import PenaltiesPanel from './PenaltiesPanel';
import AppSettingsModal from './AppSettingsModal';

let seconds: number = 0;
let interval: ReturnType<typeof setInterval>;

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [scores, setScores] = useState<Scores>(defaultScores);
  const [teamSettings, setTeamSettings] =
    useState<TeamSettingsInterface>(defaultTeamSettings);
  const [matchSettings, setMatchSettings] =
    useState<MatchSettings>(defaultMatchSettings);
  const [appSettings, setAppSettings] =
    useState<AppSettings>(defaultAppSettings);
  const [time, setTime] = useState<Time>({ paused: false });
  const [paused, setPaused] = useState(false);
  const [showAppSettings, setShowAppSettings] = useState(false);

  useEffect(() => {
    window?.electronAPI?.updateScores(scores);
    window?.electronAPI?.updateMatchSettings(matchSettings);
    window?.electronAPI?.updateTime(time);

    window?.electronAPI
      ?.getTeamSettings()
      .then((settings) => {
        if (settings) {
          setTeamSettings(settings);
          window?.electronAPI?.updateTeamSettings(settings);
        } else {
          window?.electronAPI?.updateTeamSettings(teamSettings);
        }
      })
      .catch((error: any) => {
        window?.electronAPI?.updateTeamSettings(teamSettings);
        console.error('Failed to load team settings:', error);
      });

    window?.electronAPI
      ?.getAppSettings()
      .then((settings) => {
        if (settings) {
          setAppSettings(settings);
          window?.electronAPI?.updateAppSettings(settings);
        } else {
          window?.electronAPI?.updateAppSettings(appSettings);
        }
      })
      .catch((error: any) => {
        window?.electronAPI?.updateAppSettings(appSettings);
        console.error('Failed to load app settings:', error);
      });
    0;
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
        remainingTime: timeToString(
          Math.max(
            (matchPhases?.[currentTime.matchPhase]?.end || 0) * 60 - seconds,
            0
          )
        ),
      };
      window?.electronAPI?.updateTime(updatedTime);
      return updatedTime;
    });
  };

  const startTime = (matchPhase: MatchPhase) => {
    if (interval) {
      clearInterval(interval);
    }
    updateMatchSettings({ matchPhase });
    setPaused(false);
    seconds = matchPhases[matchPhase].start * 60;
    const initialTime = {
      ...time,
      time: timeToString(seconds),
      matchPhase,
      remainingTime: timeToString(
        Math.max((matchPhases?.[matchPhase]?.end || 0) * 60 - seconds, 0)
      ),
    };
    setTime(initialTime);
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
      matchPhase: undefined,
      remainingTime: undefined,
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

  const setPenalties = (penalties: Penalty[]) => {
    const updatedScores: Scores = {
      ...scores,
      penalties,
    };
    setScores(updatedScores);
    window?.electronAPI?.updateScores(updatedScores);
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
      <div className="sticky top-0 z-40 flex items-center justify-between bg-white px-4 py-4 shadow-sm sm:px-6 lg:hidden">
        <div className="flex  items-center gap-x-4">
          <img className="h-7 w-auto" src={logo} alt="PlayOverlay logo" />
          <div className="flex-1 text-sm font-semibold leading-6 text-gray-900">
            PlayOverlay
          </div>
        </div>
        <button
          type="button"
          className="-m-2.5 ml-auto mr-4  p-2.5 text-gray-700"
          onClick={() => setSidebarOpen(true)}
        >
          <span className="sr-only">Open sidebar</span>
          <Bars3Icon className="h-6 w-6" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="-m-2.5 p-2.5 text-gray-700"
          onClick={() => setShowAppSettings(true)}
        >
          <span className="sr-only">Open App Settings</span>
          <Cog8ToothIcon className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>

      <div className="hidden shadow lg:fixed lg:inset-y-0 lg:right-0 lg:z-50 lg:flex lg:w-20 lg:flex-col lg:overflow-y-auto lg:bg-white lg:pb-4">
        <div className="flex h-16 shrink-0 items-center justify-center">
          <img className="h-8 w-auto" src={logo} alt="PlayOverlay logo" />
        </div>
        <nav className="mt-8 flex grow flex-col">
          <ul role="list" className="flex flex-1 flex-col items-center">
            <li>
              <button
                type="button"
                className="-m-2.5 p-2.5 text-gray-700"
                onClick={() => setSidebarOpen(true)}
              >
                <span className="sr-only">Open sidebar</span>
                <Bars3Icon
                  className="h-8 w-8 text-gray-500"
                  aria-hidden="true"
                />
              </button>
            </li>
            <li className="mt-auto">
              <button
                type="button"
                className="-m-2.5 p-2.5 text-gray-700"
                onClick={() => setShowAppSettings(true)}
              >
                <span className="sr-only">Open App Settings</span>
                <Cog8ToothIcon
                  className="h-8 w-8 text-gray-500"
                  aria-hidden="true"
                />
              </button>
            </li>
          </ul>
        </nav>
      </div>

      <main className="grid grid-cols-1 bg-slate-100 lg:grid-cols-2 lg:pr-20">
        <div className="lg:grid lg:h-screen lg:grid-cols-1 lg:grid-rows-2">
          <Preview keyColour={appSettings.keyColour}>
            <Screens
              teamSettings={teamSettings}
              scores={scores}
              time={time}
              matchSettings={matchSettings}
            />
          </Preview>
          <div className="lg:overflow-y-auto lg:p-4">
            <DisplayControlsPanel
              updateMatchSettings={updateMatchSettings}
              matchSettings={matchSettings}
            />
          </div>
        </div>
        <div className="lg:h-screen lg:overflow-y-auto lg:p-4">
          <TimeControlPanel
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
            autoSwitchToScoreBug={appSettings.autoSwitchToScoreBug}
            setAutoSwitchToScoreBug={(autoSwitchToScoreBug: boolean) =>
              updateAppSettings({ autoSwitchToScoreBug })
            }
            setDisplayScreen={(displayScreen: DisplayScreen) =>
              updateMatchSettings({ displayScreen })
            }
          />
          <ScoresPanel
            teamSettings={teamSettings}
            scores={scores}
            time={time}
            updateScore={updateScore}
          />
          <PenaltiesPanel
            penalties={scores.penalties}
            setPenalties={setPenalties}
            penaltiesFirstTeam={matchSettings.penaltiesFirstTeam}
            setPenaltiesFirstTeam={(penaltiesFirstTeam: homeOrAway) =>
              updateMatchSettings({ penaltiesFirstTeam })
            }
            teamSettings={teamSettings}
          />
        </div>
      </main>
      <AppSettingsModal
        open={showAppSettings}
        setOpen={() => setShowAppSettings(false)}
        appSettings={appSettings}
        updateAppSettings={updateAppSettings}
      />
    </div>
  );
}
