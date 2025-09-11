import { useState, useEffect } from 'react';

import {
  Scores,
  AppSettings,
  Penalty,
  homeOrAway,
  MatchPhase,
  SideMenuType,
} from '../../types';
import { UpdateStatus } from '../../zodSchemas';

import Preview from '../Preview/Preview';
import MatchSettingsMenu from '../MatchSettingsMenu/MatchSettingsMenu';
import TimeControlPanel from './TimeControlPanel';
import Screens from '../Screens/Screens';
import ScoresPanel from '../ScoresPanel/ScoresPanel';
import DisplayControlsPanel from './DisplayControlsPanel';
import PenaltiesPanel from './PenaltiesPanel';
import AppSettingsMenu from '../AppSettingsMenu/AppSettingsMenu';
import CustomScreensMenu from '../CustomScreens/CustomScreensMenu';
import AppNotification from '../AppNotification/AppNotification';
import SystemSettingsMenu from '../SystemSettingsMenu/SystemSettingsMenu';
import DashboardHeader from './DashboardHeader';

import { getMatchPhases, timeToString } from '../../utils';
import { DisplayScreen } from '../../constants';
import { useScoresStore } from '../../store/scores';
import { useMatchSettingsStore } from '../../store/matchSettings';
import { useMatchStateStore } from '../../store/matchState';
import { useAppSettingsStore } from '../../store/appSettings';
import { useTimeStore } from '../../store/time';
import { useCustomGraphicsStore } from '../../store/customGraphics';

// @ts-ignore
import logo from '../../assets/playoverlay-logo.svg';

let seconds: number = 0;
let interval: ReturnType<typeof setInterval>;

export default function Dashboard() {
  const [sideMenu, setSideMenu] = useState<SideMenuType>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [paused, setPaused] = useState(false);

  const scores = useScoresStore((state) => state.scores);
  const setScores = useScoresStore((state) => state.setScores);
  const matchSettings = useMatchSettingsStore((state) => state.matchSettings);
  const setMatchSettings = useMatchSettingsStore(
    (state) => state.setMatchSettings
  );
  const matchState = useMatchStateStore((state) => state.matchState);
  const setMatchState = useMatchStateStore((state) => state.setMatchState);
  const appSettings = useAppSettingsStore((state) => state.appSettings);
  const setAppSettings = useAppSettingsStore((state) => state.setAppSettings);

  const time = useTimeStore((state) => state.time);
  const setTime = useTimeStore((state) => state.setTime);

  const customGraphics = useCustomGraphicsStore(
    (state) => state.customGraphics
  );
  const setCustomGraphics = useCustomGraphicsStore(
    (state) => state.setCustomGraphics
  );

  useEffect(() => {
    const checkDemoMode = async () => {
      const demoMode = await window.electronAPI.getDemoMode();
      setIsDemoMode(demoMode);
    };

    checkDemoMode();
  }, [isDemoMode]);

  // Check for updates on launch
  useEffect(() => {
    const checkForUpdates = async () => {
      const currentUpdateStatus = await window.electronAPI.checkForUpdates();
      setUpdateStatus(currentUpdateStatus.updates);
    };

    checkForUpdates();
  }, []);

  // Set up IPC state and listeners
  useEffect(() => {
    window?.electronAPI?.updateScores(scores);
    window?.electronAPI?.updateMatchState(matchState);
    window?.electronAPI?.updateTime(time);

    window?.electronAPI
      ?.getMatchSettings()
      .then((settings) => {
        if (settings) {
          setMatchSettings(settings);
        } else {
          window?.electronAPI?.updateMatchSettings(matchSettings);
        }
      })
      .catch((error: any) => {
        window?.electronAPI?.updateMatchSettings(matchSettings);
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
      nextMatchPhase();
    });

    window.electronAPI.onHomeTeamScored(() => {
      incrementHomeTeamScore();
    });

    window.electronAPI.onAwayTeamScored(() => {
      incrementAwayTeamScore();
    });

    fetchScreens();

    const unsubscribe = window?.electronAPI?.onCustomScreensUpdated(
      (updatedScreens) => {
        setCustomGraphics(updatedScreens || []);
      }
    );

    // Clean up the listener on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  const fetchScreens = async () => {
    try {
      const storedScreens = await window?.electronAPI?.getCustomScreens();
      setCustomGraphics(storedScreens || []);
    } catch (error) {
      console.error('Failed to fetch custom screens:', error);
    }
  };

  const openSideMenu = (sideMenu: SideMenuType) => {
    setSideMenu(sideMenu);
    window?.electronAPI?.disableKeyboardShortcuts();
  };

  const closeSideMenu = () => {
    setSideMenu(null);
    window?.electronAPI?.enableKeyboardShortcuts();
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
    const currentTime = useTimeStore.getState().time;
    const remainingSeconds =
      (getMatchPhases(
        matchSettings.halfLength,
        matchSettings.extraTimeHalfLength
      )?.[currentTime.matchPhase]?.end || 0) *
        60 -
      seconds;

    const updatedTime = {
      ...currentTime,
      time: timeToString(seconds),
      remainingTime:
        remainingSeconds > 0
          ? `-${timeToString(remainingSeconds)}`
          : `+${timeToString(0 - remainingSeconds)}`,
    };
    setTime(updatedTime);
  };

  const startTime = (matchPhase: MatchPhase) => {
    if (interval) {
      clearInterval(interval);
    }

    setPaused(false);

    const phases = getMatchPhases(
      matchSettings.halfLength,
      matchSettings.extraTimeHalfLength
    );

    seconds = phases?.[matchPhase].start * 60;

    setTime({
      time: timeToString(seconds),
      matchPhase,
      remainingTime: `-${timeToString(
        Math.max((phases?.[matchPhase]?.end || 0) * 60 - seconds, 0)
      )}`,
    });

    // Update matchPhase in matchState
    setMatchState({ matchPhase });

    interval = setInterval(incrementTime, 1000);
  };

  const stopTime = () => {
    if (interval) {
      clearInterval(interval);
    }

    setTime({
      time: undefined,
      additionalTime: undefined,
      matchPhase: undefined,
      remainingTime: undefined,
    });

    setPaused(false);

    // Update matchState with matchPhase undefined and previousMatchPhase set to the phase that just ended
    setMatchState({
      previousMatchPhase: useMatchStateStore.getState().matchState.matchPhase,
      matchPhase: undefined,
    });
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
  };

  const incrementHomeTeamScore = () => {
    const prevScores = useScoresStore.getState().scores;
    const updatedScores = {
      ...prevScores,
      homeTeam: prevScores.homeTeam + 1,
    };
    setScores(updatedScores);
  };

  const incrementAwayTeamScore = () => {
    const prevScores = useScoresStore.getState().scores;
    const updatedScores = {
      ...prevScores,
      awayTeam: prevScores.awayTeam + 1,
    };
    setScores(updatedScores);
  };

  const nextMatchPhase = () => {
    const { previousMatchPhase, matchPhase } =
      useMatchStateStore.getState().matchState;

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
      setMatchState({
        matchPhase: nextPhase,
      });
      if (appSettings.autoSwitchScreens) {
        setMatchState({ displayScreen: 'scoreBug' });
      }
    } else {
      // No next phase, stop time
      stopTime();

      setMatchState({
        matchPhase: undefined,
        previousMatchPhase: matchPhase,
        displayScreen: appSettings.autoSwitchScreens
          ? 'matchTitle'
          : useMatchStateStore.getState().matchState.displayScreen,
      });
    }
  };

  return (
    <>
      <div className="select-none">
        <DashboardHeader setSideMenu={openSideMenu} />
        <main className="grid grid-cols-1 bg-slate-100 lg:grid-cols-2 lg:pr-20">
          <div className="lg:grid lg:h-screen lg:grid-cols-1 lg:grid-rows-2">
            <Preview keyColour={appSettings.keyColour}>
              <Screens
                matchSettings={matchSettings}
                scores={scores}
                time={time}
                matchState={matchState}
              />
            </Preview>
            <div className="lg:overflow-y-auto lg:p-4">
              <DisplayControlsPanel
                updateMatchState={setMatchState}
                matchState={matchState}
                customGraphics={customGraphics}
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
                setMatchState({ displayScreen })
              }
            />
            <ScoresPanel
              matchSettings={matchSettings}
              scores={scores}
              time={time}
              updateScore={setScores}
            />
            <PenaltiesPanel
              penalties={scores.penalties}
              setPenalties={setPenalties}
              penaltiesFirstTeam={matchState.penaltiesFirstTeam}
              setPenaltiesFirstTeam={(penaltiesFirstTeam: homeOrAway) =>
                setMatchState({ penaltiesFirstTeam })
              }
              matchSettings={matchSettings}
            />
          </div>
        </main>
        <MatchSettingsMenu
          sidebarOpen={sideMenu === 'team-settings'}
          setSidebarOpen={closeSideMenu}
          matchSettings={matchSettings}
          updateMatchSettings={setMatchSettings}
          appSettings={appSettings}
          isDemoMode={isDemoMode}
        />
        <CustomScreensMenu
          open={sideMenu === 'custom-screens'}
          setOpen={closeSideMenu}
          keyColour={appSettings.keyColour}
          customGraphics={customGraphics}
          fetchScreens={fetchScreens}
        />
        <AppSettingsMenu
          open={sideMenu === 'app-settings'}
          setOpen={closeSideMenu}
          appSettings={appSettings}
          updateAppSettings={updateAppSettings}
        />
        <SystemSettingsMenu
          open={sideMenu === 'system-settings'}
          setOpen={closeSideMenu}
          isDemoMode={isDemoMode}
          incrementHomeTeamScore={incrementHomeTeamScore}
          incrementAwayTeamScore={incrementAwayTeamScore}
          stopTime={stopTime}
          matchSettings={matchSettings}
          startTime={startTime}
          updateMatchState={setMatchState}
          matchState={matchState}
          autoSwitchScreens={appSettings.autoSwitchScreens}
          time={time}
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
