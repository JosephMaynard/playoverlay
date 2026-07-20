import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Scores,
  AppSettings,
  Penalty,
  homeOrAway,
  LiveMatch,
  MatchPhase,
  SideMenuType,
} from '../../types';
import {
  MatchSettings,
  matchSetingsSchema,
  UpdateStatus,
} from '../../zodSchemas';

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
import useMatchClock from './useMatchClock';

import { getPhaseList, getNextPhaseId } from '../../utils';
import { defaultMatchSettings, defaultMatchState } from '../../constants';
import { useScoresStore } from '../../store/scores';
import { useMatchSettingsStore } from '../../store/matchSettings';
import { useMatchStateStore } from '../../store/matchState';
import { useAppSettingsStore } from '../../store/appSettings';
import { useTimeStore } from '../../store/time';
import { useCustomGraphicsStore } from '../../store/customGraphics';
import logo from '../../assets/playoverlay-logo.svg';

export default function Dashboard() {
  const { t } = useTranslation();
  const [sideMenu, setSideMenu] = useState<SideMenuType>(null);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [restorableMatch, setRestorableMatch] = useState<LiveMatch | null>(
    null
  );

  const clock = useMatchClock();

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
  const markSettingsLoaded = useAppSettingsStore(
    (state) => state.markSettingsLoaded
  );

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
      setUpdateStatus(currentUpdateStatus.updates ?? null);
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
      })
      // Whether or not stored settings existed, the load has now completed —
      // the first-run language picker can decide whether to show.
      .finally(() => {
        markSettingsLoaded();
      });

    const unsubscribeNextPhase = window.electronAPI.onNextMatchPhase(() => {
      nextMatchPhase();
    });

    const unsubscribeHomeScored = window.electronAPI.onHomeTeamScored(() => {
      incrementHomeTeamScore();
    });

    const unsubscribeAwayScored = window.electronAPI.onAwayTeamScored(() => {
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

    // Clean up the listeners on unmount so a remount can never double-fire
    // a shortcut (one press = two goals)
    return () => {
      unsubscribe();
      unsubscribeNextPhase();
      unsubscribeHomeScored();
      unsubscribeAwayScored();
    };
    // Mount-only: seeds the main process with the initial scores/matchState/
    // time (ongoing changes are mirrored to IPC by each store's setter, per
    // house style), fetches settings once, and registers shortcut/update
    // listeners for the component's lifetime. The listener callbacks
    // (nextMatchPhase, incrementHomeTeamScore, etc.) read fresh state via
    // each zustand store's getState() rather than closing over this scope,
    // so they never go stale. Re-running this effect on every dependency
    // change would instead tear down and re-register the listeners on every
    // render (risking a dropped shortcut mid-swap) and keep re-posting the
    // stale initial scores/matchState/time over IPC.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Settings changes that remove the running phase — timer mode switch,
  // extra time off, fewer periods — stop the clock instead of leaving it
  // orphaned on a phase id that no longer exists.
  const updateMatchSettings = (settingsUpdate: Partial<MatchSettings>) => {
    const mergedSettings = {
      ...useMatchSettingsStore.getState().matchSettings,
      ...settingsUpdate,
    };
    const { matchPhase } = useTimeStore.getState().time;
    const newPhaseList = getPhaseList(mergedSettings);
    if (
      matchPhase !== undefined &&
      !newPhaseList.some((phase) => phase.id === matchPhase)
    ) {
      // Settings edits never switch the operator's display screen.
      clock.stopTime({ autoSwitch: false });
    }
    // A stopped match's previousMatchPhase can also vanish from the new
    // phase list (e.g. extra time turned off after extra time was played);
    // clear it so the next-phase shortcut isn't left permanently dead.
    const { previousMatchPhase } = useMatchStateStore.getState().matchState;
    if (
      previousMatchPhase !== undefined &&
      !newPhaseList.some((phase) => phase.id === previousMatchPhase)
    ) {
      setMatchState({ previousMatchPhase: undefined });
    }
    setMatchSettings(settingsUpdate);
  };

  // Starting a phase supersedes any offer to restore a previous match. That
  // belongs here rather than in the clock hook: it's Dashboard-local UI
  // state the hook has no notion of.
  const startTime = (matchPhase: MatchPhase) => {
    setRestorableMatch(null);
    clock.startTime(matchPhase);
  };

  const restoreMatch = (liveMatch: LiveMatch) => {
    // Applied first (full replace, so no stray field from whatever's
    // currently loaded survives) so the clock and phase list below
    // reinterpret the snapshot's scores/state/time against the settings
    // that were active when it was taken. Older snapshots predate this
    // field and simply keep whatever match settings are already loaded.
    if (liveMatch.matchSettings) {
      // Validate the snapshot's settings the same way stored MATCH_SETTINGS
      // are validated on load: the LIVE_MATCH snapshot is otherwise the only
      // path that writes match settings without a schema check, so a corrupt
      // config.json could feed e.g. an out-of-range periodCount straight into
      // getPhaseList. A failed parse falls back to the current settings.
      const parsed = matchSetingsSchema.safeParse(liveMatch.matchSettings);
      if (parsed.success) {
        setMatchSettings({ ...defaultMatchSettings, ...parsed.data });
      }
    }
    setScores(liveMatch.scores);
    // Restore fully replaces the match state. The store setter merges and
    // both defaultMatchState and the snapshot may omit optional keys, so the
    // optional fields are cleared explicitly first — otherwise one left over
    // from the current session (e.g. a customScreenImageUrl, or a stale
    // matchPhase) would survive into the restored match.
    setMatchState({
      matchPhase: undefined,
      previousMatchPhase: undefined,
      customScreenImageUrl: undefined,
      ...defaultMatchState,
      ...liveMatch.matchState,
    });
    clock.restoreClock(liveMatch.time);
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
    setRestorableMatch(null);
    const prevScores = useScoresStore.getState().scores;
    const updatedScores = {
      ...prevScores,
      homeTeam: prevScores.homeTeam + 1,
    };
    setScores(updatedScores);
  };

  const incrementAwayTeamScore = () => {
    setRestorableMatch(null);
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

    const phaseList = getPhaseList(
      useMatchSettingsStore.getState().matchSettings
    );
    const nextPhase = getNextPhaseId(phaseList, matchPhase, previousMatchPhase);

    if (nextPhase) {
      // startTime (and the clock hook underneath it) handles the matchState
      // update and the auto-switch-screens behaviour.
      startTime(nextPhase);
    } else if (matchPhase !== undefined) {
      // No next phase, and a phase is currently running (full time reached):
      // stop the clock and record how far the match got. Guarded on
      // matchPhase so a stray shortcut press after the match has already
      // finished (matchPhase already undefined) is a no-op — otherwise it
      // would overwrite previousMatchPhase and let the match restart from
      // the first phase.
      clock.stopTime();
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
                clockFormat={appSettings.clockFormat}
              />
            </Preview>
            <div className="lg:overflow-y-auto lg:p-4">
              <DisplayControlsPanel
                updateMatchState={setMatchState}
                matchState={matchState}
                customGraphics={customGraphics}
                matchSettings={matchSettings}
              />
            </div>
          </div>
          <div className="lg:h-screen lg:overflow-y-auto lg:p-4">
            <TimeControlPanel
              time={time}
              matchSettings={matchSettings}
              pause={clock.pause}
              resume={clock.resume}
              adjustTime={clock.adjustTime}
              isPaused={clock.paused}
              setAdditionalTime={(additionalTime: number) =>
                // setTime merges; spreading the render-scope time here
                // would overwrite a fresher tick with stale clock strings
                setTime({ additionalTime: additionalTime || undefined })
              }
              startTime={startTime}
              stopTime={clock.stopTime}
              autoSwitchScreens={appSettings.autoSwitchScreens}
              setAutoSwitchScreens={(autoSwitchScreens: boolean) =>
                updateAppSettings({ autoSwitchScreens })
              }
            />
            <ScoresPanel
              matchSettings={matchSettings}
              scores={scores}
              time={time}
              updateScore={(updatedScores: Scores) => {
                // Editing the score supersedes the restore offer
                setRestorableMatch(null);
                setScores(updatedScores);
              }}
            />
            {matchSettings.hasPenalties !== false && (
              <PenaltiesPanel
                penalties={scores.penalties}
                setPenalties={setPenalties}
                penaltiesFirstTeam={matchState.penaltiesFirstTeam}
                setPenaltiesFirstTeam={(penaltiesFirstTeam: homeOrAway) =>
                  setMatchState({ penaltiesFirstTeam })
                }
                matchSettings={matchSettings}
              />
            )}
          </div>
        </main>
        <MatchSettingsMenu
          sidebarOpen={sideMenu === 'team-settings'}
          setSidebarOpen={closeSideMenu}
          matchSettings={matchSettings}
          updateMatchSettings={updateMatchSettings}
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
          stopTime={clock.stopTime}
          matchSettings={matchSettings}
          startTime={startTime}
          updateMatchState={setMatchState}
          matchState={matchState}
          time={time}
          appSettings={appSettings}
          updateAppSettings={updateAppSettings}
        />
      </div>
      <div
        aria-live="assertive"
        className="pointer-events-none fixed inset-0 z-50 flex flex-col items-center gap-4 px-4 py-6 sm:items-end sm:p-6"
      >
        {restorableMatch && (
          <AppNotification
            title={t('dashboard:notifications.restoreMatch.title')}
            text={
              restorableMatch.time?.time
                ? t('dashboard:notifications.restoreMatch.bodyWithTime', {
                    homeTeam:
                      restorableMatch.matchSettings?.homeTeamNameAbbreviated ??
                      matchSettings.homeTeamNameAbbreviated,
                    homeScore: restorableMatch.scores?.homeTeam ?? 0,
                    awayScore: restorableMatch.scores?.awayTeam ?? 0,
                    awayTeam:
                      restorableMatch.matchSettings?.awayTeamNameAbbreviated ??
                      matchSettings.awayTeamNameAbbreviated,
                    time: restorableMatch.time.time,
                  })
                : t('dashboard:notifications.restoreMatch.body', {
                    homeTeam:
                      restorableMatch.matchSettings?.homeTeamNameAbbreviated ??
                      matchSettings.homeTeamNameAbbreviated,
                    homeScore: restorableMatch.scores?.homeTeam ?? 0,
                    awayScore: restorableMatch.scores?.awayTeam ?? 0,
                    awayTeam:
                      restorableMatch.matchSettings?.awayTeamNameAbbreviated ??
                      matchSettings.awayTeamNameAbbreviated,
                  })
            }
            icon={
              <img className="h-8 w-auto" src={logo} alt="PlayOverlay logo" />
            }
            buttonOnClick={() => restoreMatch(restorableMatch)}
            buttonText={t('settings:matchMenu.saved.restore')}
          />
        )}
        {updateStatus?.newVersionAvailable && (
          <AppNotification
            title={t('dashboard:notifications.updateAvailable.title')}
            text={t('dashboard:notifications.updateAvailable.body', {
              version: updateStatus?.latestVersion,
            })}
            icon={
              <img className="h-8 w-auto" src={logo} alt="PlayOverlay logo" />
            }
            buttonOnClick={() => {
              window?.electronAPI?.openUrlInBrowser(updateStatus?.downloadUrl);
            }}
            buttonText={t('dashboard:notifications.updateAvailable.button')}
          />
        )}
      </div>
    </>
  );
}
