import { useState, useEffect } from 'react';

import {
  Scores,
  AppSettings,
  Penalty,
  homeOrAway,
  LiveMatch,
  MatchPhase,
  SideMenuType,
  Time,
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
import logo from '../../assets/playoverlay-logo.svg';

// The displayed clock is derived from a wall-clock anchor (baseSeconds plus
// the real time elapsed since tickingSince) rather than counting interval
// callbacks, so delayed timers can't make the clock drift over a half.
let seconds = 0;
let baseSeconds = 0;
let tickingSince: number | null = null;
let interval: ReturnType<typeof setInterval> | undefined;

export default function Dashboard() {
  const [sideMenu, setSideMenu] = useState<SideMenuType>(null);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [paused, setPaused] = useState(false);
  const [restorableMatch, setRestorableMatch] = useState<LiveMatch | null>(
    null
  );

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
      .catch((error: unknown) => {
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
      .catch((error: unknown) => {
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

    // Offer to restore a match that was in progress when the app last closed
    window?.electronAPI
      ?.getLiveMatch()
      .then((liveMatch) => {
        if (
          liveMatch &&
          (liveMatch.scores?.homeTeam > 0 ||
            liveMatch.scores?.awayTeam > 0 ||
            (liveMatch.scores?.penalties?.length ?? 0) > 0 ||
            liveMatch.time?.matchPhase !== undefined ||
            liveMatch.matchState?.previousMatchPhase !== undefined)
        ) {
          setRestorableMatch(liveMatch);
        }
      })
      .catch((error: unknown) => {
        console.error('Failed to check for a previous match:', error);
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

  // Push a new clock value (and any extra time fields) to the time store.
  // Match settings are read fresh from the store so a half-length change
  // mid-half takes effect immediately.
  const applyTime = (newSeconds: number, timeUpdates: Partial<Time> = {}) => {
    seconds = newSeconds;
    const currentTime = useTimeStore.getState().time;
    const currentMatchSettings = useMatchSettingsStore.getState().matchSettings;
    const matchPhase = timeUpdates.matchPhase ?? currentTime.matchPhase;
    const remainingSeconds =
      (getMatchPhases(
        currentMatchSettings.halfLength,
        currentMatchSettings.extraTimeHalfLength
      )?.[matchPhase]?.end || 0) *
        60 -
      newSeconds;

    setTime({
      ...currentTime,
      ...timeUpdates,
      time: timeToString(newSeconds),
      remainingTime:
        remainingSeconds > 0
          ? `-${timeToString(remainingSeconds)}`
          : `+${timeToString(0 - remainingSeconds)}`,
    });
  };

  const tick = () => {
    if (tickingSince === null) return;
    const newSeconds =
      baseSeconds + Math.round((Date.now() - tickingSince) / 1000);
    if (newSeconds !== seconds) {
      applyTime(newSeconds);
    }
  };

  const startTicking = () => {
    if (interval) {
      clearInterval(interval);
    }
    baseSeconds = seconds;
    tickingSince = Date.now();
    // Tick faster than once per second: each tick recomputes from the wall
    // clock, so the displayed time stays accurate even after delays
    interval = setInterval(tick, 250);
  };

  const stopTicking = () => {
    if (interval) {
      clearInterval(interval);
      interval = undefined;
    }
    tickingSince = null;
  };

  const startTime = (matchPhase: MatchPhase) => {
    stopTicking();
    setPaused(false);

    const phases = getMatchPhases(
      useMatchSettingsStore.getState().matchSettings.halfLength,
      useMatchSettingsStore.getState().matchSettings.extraTimeHalfLength
    );

    applyTime(phases?.[matchPhase].start * 60, { matchPhase, paused: false });

    // Update matchPhase in matchState
    setMatchState({ matchPhase });

    startTicking();
  };

  const stopTime = () => {
    stopTicking();

    setTime({
      time: undefined,
      additionalTime: undefined,
      matchPhase: undefined,
      remainingTime: undefined,
      paused: false,
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
      stopTicking();
      setPaused(true);
      setTime({ paused: true });
    }
  };

  const resume = () => {
    startTicking();
    setPaused(false);
    setTime({ paused: false });
  };

  const restoreMatch = (liveMatch: LiveMatch) => {
    stopTicking();

    setScores(liveMatch.scores);
    setMatchState(liveMatch.matchState);

    if (liveMatch.time?.time) {
      const [minutes, secs] = liveMatch.time.time.split(':').map(Number);
      seconds = (minutes || 0) * 60 + (secs || 0);
      baseSeconds = seconds;
    }

    // Restore with the clock paused; the operator resumes when ready
    const clockWasRunning = liveMatch.time?.matchPhase !== undefined;
    setTime({ ...liveMatch.time, paused: clockWasRunning });
    setPaused(clockWasRunning);

    setRestorableMatch(null);
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
                const newSeconds = Math.max(seconds + difference, 0);
                baseSeconds = newSeconds;
                if (tickingSince !== null) {
                  tickingSince = Date.now();
                }
                applyTime(newSeconds);
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
      {restorableMatch && (
        <AppNotification
          title="Restore previous match?"
          text={`A match was in progress when PlayOverlay last closed (${
            matchSettings.homeTeamNameAbbreviated
          } ${restorableMatch.scores?.homeTeam ?? 0}–${
            restorableMatch.scores?.awayTeam ?? 0
          } ${matchSettings.awayTeamNameAbbreviated}${
            restorableMatch.time?.time ? `, ${restorableMatch.time.time}` : ''
          }). Restoring brings back the score and clock, with the clock paused.`}
          icon={
            <img className="h-8 w-auto" src={logo} alt="PlayOverlay logo" />
          }
          buttonOnClick={() => restoreMatch(restorableMatch)}
          buttonText="Restore"
        />
      )}
      {updateStatus?.newVersionAvailable && (
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
