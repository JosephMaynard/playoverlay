import { useState, useEffect, useCallback, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';

import {
  Scores,
  Time,
  AppSettings,
  MatchSettings,
  Penalty,
  homeOrAway,
  DisplayScreen,
  MatchPhase,
} from '../../types';
import Preview from '../Preview/Preview';
import TeamSettingsMenu from './TeamSettingsMenu';
import TimeControlPanel from './TimeControlPanel';
import {
  defaultAppSettings,
  defaultMatchSettings,
  defaultTeamSettings,
} from '../../constants';
import Screens from '../Screens/Screens';

// @ts-ignore
import logo from '../../assets/playoverlay-logo.svg';
import ScoresPanel from './ScoresPanel';
import DisplayControlsPanel from './DisplayControlsPanel';
import { getMatchPhases, timeToString } from '../../utils';
import PenaltiesPanel from './PenaltiesPanel';
import AppSettingsMenu from './AppSettingsMenu';
import CustomScreensMenu from '../CustomScreens/CustomScreensMenu';
import AppNotification from '../AppNotification/AppNotification';
import SystemSettingsMenu from '../SystemSettingsMenu/SystemSettingsMenu';
import { TeamSettingsInterface, UpdateStatus } from 'src/zodSchemas';
import DashboardHeader from './DashboardHeader';
import { useScoresStore } from '../../store/scores';

let seconds: number = 0;
let interval: ReturnType<typeof setInterval>;

export type SideMenuType =
  | null
  | 'app-settings'
  | 'custom-screens'
  | 'team-settings'
  | 'system-settings';

export default function Dashboard() {
  const [sideMenu, setSideMenu] = useState<SideMenuType>(null);

  const scores = useScoresStore((state) => state.scores);

  const updateScoresState = useScoresStore((state) => state.updateScores);

  const [teamSettings, setTeamSettings] =
    useState<TeamSettingsInterface>(defaultTeamSettings);
  const [matchSettings, setMatchSettings] =
    useState<MatchSettings>(defaultMatchSettings);
  const [appSettings, setAppSettings] =
    useState<AppSettings>(defaultAppSettings);
  const [time, setTime] = useState<Time>({ paused: false });
  const [paused, setPaused] = useState(false);

  const [isDemoMode, setIsDemoMode] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);

  useEffect(() => {
    const checkDemoMode = async () => {
      const demoMode = await window.electronAPI.getDemoMode();
      setIsDemoMode(demoMode);
    };

    checkDemoMode();
  }, [isDemoMode]);

  useEffect(() => {
    const checkForUpdates = async () => {
      const currentUpdateStatus = await window.electronAPI.checkForUpdates();
      setUpdateStatus(currentUpdateStatus.updates);
    };

    checkForUpdates();
  }, []);

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

    window.electronAPI.onNextMatchPhase(() => {
      nextMatchPhaseRef.current();
    });

    window.electronAPI.onHomeTeamScored(() => {
      incrementHomeTeamScore();
    });

    window.electronAPI.onAwayTeamScored(() => {
      incrementAwayTeamScore();
    });
  }, []);

  const updateScore = (scoreUpdates: Partial<Scores>) => {
    const updatedScores = { ...scores, ...scoreUpdates };
    window?.electronAPI?.updateScores(updatedScores);
    updateScoresState(updatedScores);
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
    setMatchSettings((prevSettings) => {
      const updatedSettings = {
        ...prevSettings,
        ...settingsUpdated,
      };
      window?.electronAPI?.updateMatchSettings(updatedSettings);
      return updatedSettings;
    });
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
            (getMatchPhases(
              matchSettings.halfLength,
              matchSettings.extraTimeHalfLength
            )?.[currentTime.matchPhase]?.end || 0) *
              60 -
              seconds,
            0
          )
        ),
      };
      window?.electronAPI?.updateTime(updatedTime);
      return updatedTime;
    });
  };

  const startTime = useCallback(
    (matchPhase: MatchPhase) => {
      if (interval) {
        clearInterval(interval);
      }

      setPaused(false);

      const phases = getMatchPhases(
        matchSettings.halfLength,
        matchSettings.extraTimeHalfLength
      );

      seconds = phases?.[matchPhase].start * 60;

      setTime((prevTime) => {
        const initialTime = {
          ...prevTime,
          time: timeToString(seconds),
          matchPhase,
          remainingTime: timeToString(
            Math.max((phases?.[matchPhase]?.end || 0) * 60 - seconds, 0)
          ),
        };
        window?.electronAPI?.updateTime(initialTime);
        return initialTime;
      });

      // Update matchPhase in matchSettings
      setMatchSettings((prevSettings) => {
        const updatedSettings = {
          ...prevSettings,
          matchPhase,
        };
        window?.electronAPI?.updateMatchSettings(updatedSettings);
        return updatedSettings;
      });

      interval = setInterval(incrementTime, 1000);
    },
    [matchSettings.halfLength, matchSettings.extraTimeHalfLength]
  );

  const stopTime = useCallback(() => {
    if (interval) {
      clearInterval(interval);
    }

    setTime((prevTime) => {
      const updatedTime: Time = {
        ...prevTime,
        time: undefined,
        additionalTime: undefined,
        matchPhase: undefined,
        remainingTime: undefined,
      };
      window?.electronAPI?.updateTime(updatedTime);
      return updatedTime;
    });

    setPaused(false);

    // Update matchSettings with matchPhase undefined and previousMatchPhase set to the phase that just ended
    setMatchSettings((prevMatchSettings) => {
      const updatedMatchSettings = {
        ...prevMatchSettings,
        previousMatchPhase: prevMatchSettings.matchPhase,
      };
      delete updatedMatchSettings.matchPhase;
      window?.electronAPI?.updateMatchSettings(updatedMatchSettings);
      return updatedMatchSettings;
    });
  }, []);

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
    updateScoresState(updatedScores);
    window?.electronAPI?.updateScores(updatedScores);
  };

  const incrementHomeTeamScore = () => {
    const prevScores = useScoresStore.getState().scores;
    const updatedScores = {
      ...prevScores,
      homeTeam: prevScores.homeTeam + 1,
    };
    window?.electronAPI?.updateScores(updatedScores);
    updateScoresState(updatedScores);
  };

  const incrementAwayTeamScore = () => {
    const prevScores = useScoresStore.getState().scores;
    const updatedScores = {
      ...prevScores,
      awayTeam: prevScores.awayTeam + 1,
    };
    window?.electronAPI?.updateScores(updatedScores);
    updateScoresState(updatedScores);
  };

  const nextMatchPhase = useCallback(() => {
    setMatchSettings((prevMatchSettings) => {
      const { previousMatchPhase, matchPhase } = prevMatchSettings;

      console.log('prevMatchSettings', prevMatchSettings);

      let nextPhase: MatchPhase | undefined;

      if (matchPhase === undefined) {
        if (previousMatchPhase === undefined) {
          // Start from the first phase
          nextPhase = 'firstHalf';
        } else if (previousMatchPhase === 'firstHalf') {
          nextPhase = 'secondHalf';
        } else if (previousMatchPhase === 'secondHalf') {
          nextPhase = 'extraTimeFirstHalf';
        } else if (previousMatchPhase === 'extraTimeFirstHalf') {
          nextPhase = 'extraTimeSecondHalf';
        }
      }

      if (nextPhase) {
        startTime(nextPhase);
        const updatedMatchSettings = {
          ...prevMatchSettings,
          matchPhase: nextPhase,
        };
        delete updatedMatchSettings.previousMatchPhase;
        window?.electronAPI?.updateMatchSettings(updatedMatchSettings);
        return updatedMatchSettings;
      } else {
        // No next phase, stop time
        stopTime();
        return {
          ...prevMatchSettings,
          matchPhase: undefined,
          previousMatchPhase: prevMatchSettings.matchPhase,
        };
      }
    });
  }, [startTime, stopTime]);

  const nextMatchPhaseRef = useRef(nextMatchPhase);
  useEffect(() => {
    nextMatchPhaseRef.current = nextMatchPhase;
  }, [nextMatchPhase]);

  return (
    <>
      <div className="select-none">
        <DashboardHeader setSideMenu={setSideMenu} />
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
              matchSettings={matchSettings}
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
              autoSwitchScreens={appSettings.autoSwitchScreens}
              setAutoSwitchScreens={(autoSwitchScreens: boolean) =>
                updateAppSettings({ autoSwitchScreens })
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
        <TeamSettingsMenu
          matchSettings={matchSettings}
          updateMatchSettings={updateMatchSettings}
          sidebarOpen={sideMenu === 'team-settings'}
          setSidebarOpen={() => setSideMenu(null)}
          teamSettings={teamSettings}
          updateTeamSettings={updateTeamSettings}
          appSettings={appSettings}
          isDemoMode={isDemoMode}
        />
        <CustomScreensMenu
          open={sideMenu === 'custom-screens'}
          setOpen={() => setSideMenu(null)}
          keyColour={appSettings.keyColour}
        />
        <AppSettingsMenu
          open={sideMenu === 'app-settings'}
          setOpen={() => setSideMenu(null)}
          appSettings={appSettings}
          updateAppSettings={updateAppSettings}
        />
        <SystemSettingsMenu
          open={sideMenu === 'system-settings'}
          setOpen={() => setSideMenu(null)}
          isDemoMode={isDemoMode}
        />
      </div>
      {isDemoMode && (
        <AppNotification
          title="PlayOverlay Demo"
          text="PlayOverlay is running in demo mode, some features have been disabled. To unlock all features, buy a licence from playoverlay.com or activatve an existing purchase."
          icon={
            <img className="h-8 w-auto" src={logo} alt="PlayOverlay logo" />
          }
          buttonOnClick={() => {
            window?.electronAPI?.openUrlInBrowser(
              'https://account.playoverlay.com/'
            );
          }}
          buttonText="Buy now"
        />
      )}
      {!isDemoMode && updateStatus?.newVersionAvailable && (
        <AppNotification
          title="Update available"
          text={`A new version of PlayOverlay (v${updateStatus?.latestVersion}) is now available.`}
          icon={
            <img className="h-8 w-auto" src={logo} alt="PlayOverlay logo" />
          }
          buttonOnClick={() => {
            window?.electronAPI?.openUrlInBrowser(updateStatus?.downloadUrl);
          }}
          buttonText="Download now"
        />
      )}
    </>
  );
}
