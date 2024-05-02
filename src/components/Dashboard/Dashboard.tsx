import { useState, useEffect } from 'react';
import { Bars3Icon } from '@heroicons/react/24/outline';

import {
  Scores,
  TeamSettingsInterface,
  Time,
  AppSettings,
  MatchSettings,
  Penalty,
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
import WindowControlsPanel from './WindowControlsPanel';

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

  useEffect(() => {
    window?.electronAPI?.updateScores(scores);
    window?.electronAPI?.updateMatchSettings(matchSettings);
    window?.electronAPI?.updateTime(time);
    window?.electronAPI?.startPowerSaveBlocker();

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

  const addPenalty = (penalty: Penalty) => {
    setScores({
      ...scores,
      penalties: [...scores.penalties, penalty],
    });
  };

  const undoPenalty = () => {
    setScores({
      ...scores,
      penalties: scores.penalties.slice(0, -1),
    });
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
        <div className="lg:grid lg:grid-cols-1 lg:grid-rows-2 lg:[height:calc(100vh-3.75rem)]">
          <Preview keyColour={appSettings.keyColour}>
            <Screens
              teamSettings={teamSettings}
              scores={scores}
              time={time}
              matchSettings={matchSettings}
            />
          </Preview>
          <div className="lg:overflow-y-auto lg:px-4 ">
            <DisplayControlsPanel
              updateMatchSettings={updateMatchSettings}
              matchSettings={matchSettings}
            />
            <WindowControlsPanel />
          </div>
        </div>
        <div className="lg:overflow-y-auto lg:p-4 lg:[height:calc(100vh-3.75rem)]">
          <ScoresPanel
            teamSettings={teamSettings}
            scores={scores}
            time={time}
            updateScore={updateScore}
          />
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
            matchPhase={matchSettings.matchPhase}
          />
        </div>
      </main>
    </div>
  );
}
