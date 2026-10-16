import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { RocketLaunchIcon } from '@heroicons/react/24/outline';

import {
  AppSettings,
  homeOrAway,
  LiveMatch,
  SideMenuType,
  UpdateStatus,
  useMatchClock,
  createMatchActions,
  DisplayScreen,
  isRestorableLiveMatch,
  useScoresStore,
  useMatchSettingsStore,
  useMatchStateStore,
  useAppSettingsStore,
  useTimeStore,
  useCustomGraphicsStore,
  useUndoStore,
  selectCanUndo,
  isTextEntryTarget,
  reconcileActiveOverlays,
  reconcileActiveScreen,
  reconcileLineupScreen,
  getScreenRotationSettings,
  useScreenRotation,
  useScreenRotationStore,
} from '@playoverlay/core';
import Screens from '@playoverlay/screens';
import { connectStoresToElectron } from '../../electronBridge';

import Preview from '../Preview/Preview';
import MatchSettingsMenu from '../MatchSettingsMenu/MatchSettingsMenu';
import TimeControlPanel from './TimeControlPanel';
import ScoresPanel from '../ScoresPanel/ScoresPanel';
import DisplayControlsPanel from './DisplayControlsPanel';
import PenaltiesPanel from './PenaltiesPanel';
import GoalLogPanel from './GoalLogPanel';
import ScreenRotationPanel from './ScreenRotationPanel';
import AppSettingsMenu from '../AppSettingsMenu/AppSettingsMenu';
import CustomScreensMenu from '../CustomScreens/CustomScreensMenu';
import AppNotification from '../AppNotification/AppNotification';
import SystemSettingsMenu from '../SystemSettingsMenu/SystemSettingsMenu';
import PreflightModal from '../Preflight/PreflightModal';
import Modal from '../Modal/Modal';
import DashboardHeader from './DashboardHeader';

import logo from '../../assets/playoverlay-logo.svg';

export default function Dashboard() {
  const { t } = useTranslation();
  const [sideMenu, setSideMenu] = useState<SideMenuType>(null);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [restorableMatch, setRestorableMatch] = useState<LiveMatch | null>(
    null
  );
  const [preflightOpen, setPreflightOpen] = useState(false);
  const [newMatchOpen, setNewMatchOpen] = useState(false);

  const clock = useMatchClock();
  // Cycles the display through the operator's chosen screens while a
  // rotation is running (see the Rotate screens panel).
  useScreenRotation();
  const rotating = useScreenRotationStore((state) => state.active);

  const scores = useScoresStore((state) => state.scores);
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

  const customGraphics = useCustomGraphicsStore(
    (state) => state.customGraphics
  );
  const setCustomGraphics = useCustomGraphicsStore(
    (state) => state.setCustomGraphics
  );
  // Until the library has actually been read, an empty customGraphics means
  // "not loaded yet", not "every graphic was deleted", so active overlays are
  // only reconciled against it once this is set.
  const [customGraphicsLoaded, setCustomGraphicsLoaded] = useState(false);

  // Undo/redo. undo/redo/registerClockResync are stable store methods (the
  // match actions capture undo entries themselves); canUndo is subscribed so
  // the penalty panel's shared "Undo" button enables/disables with the stack.
  // undo is wired to the penalty panel's shared "Undo" button; the keyboard
  // shortcut reads undo/redo fresh from getState() instead (see below), so
  // redo needs no render-scope binding here.
  const undo = useUndoStore((state) => state.undo);
  const registerClockResync = useUndoStore(
    (state) => state.registerClockResync
  );
  const canUndo = useUndoStore(selectCanUndo);

  // Mirror the match stores to the main process and log operator actions
  // there, for as long as the dashboard is mounted. Declared before the
  // dashboard's other effects so it is connected before the mount effect
  // below loads state through the store setters.
  useEffect(() => connectStoresToElectron(), []);

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
      // Whether or not stored settings existed, the load has now completed -
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

    // Phone-remote commands. These share the same store setters as the
    // operator's own controls, so a phone tap and an on-screen click produce
    // identical behaviour. Like the shortcut handlers above, each reads fresh
    // state from the relevant store's getState() rather than closing over this
    // render's scope.
    const unsubscribeHomeUnscored = window.electronAPI.onHomeTeamUnscored(
      () => {
        decrementHomeTeamScore();
      }
    );

    const unsubscribeAwayUnscored = window.electronAPI.onAwayTeamUnscored(
      () => {
        decrementAwayTeamScore();
      }
    );

    const unsubscribeToggleClock = window.electronAPI.onToggleClock(() => {
      toggleClock();
    });

    const unsubscribeSetScreen = window.electronAPI.onSetDisplayScreen(
      (screen) => {
        setDisplayScreen(screen as DisplayScreen);
      }
    );

    // Offer to restore a match that was in progress when the app last closed
    window?.electronAPI
      ?.getLiveMatch()
      .then((liveMatch) => {
        if (liveMatch && isRestorableLiveMatch(liveMatch)) {
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
        setCustomGraphicsLoaded(true);
      }
    );

    // Clean up the listeners on unmount so a remount can never double-fire
    // a shortcut (one press = two goals)
    return () => {
      unsubscribe();
      unsubscribeNextPhase();
      unsubscribeHomeScored();
      unsubscribeAwayScored();
      unsubscribeHomeUnscored();
      unsubscribeAwayUnscored();
      unsubscribeToggleClock();
      unsubscribeSetScreen();
    };
    // Mount-only: seeds the main process with the initial scores/matchState/
    // time (ongoing changes are mirrored to IPC by the store mirror connected
    // above), fetches settings once, and registers shortcut/update
    // listeners for the component's lifetime. The listener callbacks
    // (nextMatchPhase, incrementHomeTeamScore, etc.) read fresh state via
    // each zustand store's getState() rather than closing over this scope,
    // so they never go stale. Re-running this effect on every dependency
    // change would instead tear down and re-register the listeners on every
    // render (risking a dropped shortcut mid-swap) and keep re-posting the
    // stale initial scores/matchState/time over IPC.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Let the undo store re-anchor the match clock after a restore. The clock's
  // running value is derived from an internal anchor (see useMatchClock), so
  // restoring the time store alone is not enough; undo()/redo() call this to
  // continue ticking from the restored value (or stay paused). Cleared on
  // unmount via the returned unregister.
  useEffect(() => {
    return registerClockResync(clock.resyncToTime);
  }, [registerClockResync, clock.resyncToTime]);

  // Active overlays are copies of library entries, so a rename, a screen-link
  // edit, a delete or a switch to full-screen in Custom Screens would
  // otherwise leave a stale copy on air (and, for a rename, one the
  // operator's toggle could no longer take off). A full-screen graphic that
  // is deleted or turned into an overlay likewise comes off air. An undo can
  // also bring back state from before such an edit. Not recorded as an undo
  // step: it only follows the library, it isn't an operator action.
  useEffect(() => {
    if (!customGraphicsLoaded) return;
    const reconciledOverlays = reconcileActiveOverlays(
      matchState.overlays ?? [],
      customGraphics
    );
    const reconciledScreen = reconcileActiveScreen(matchState, customGraphics);
    if (reconciledOverlays || reconciledScreen) {
      setMatchState({
        ...(reconciledOverlays ? { overlays: reconciledOverlays } : {}),
        ...reconciledScreen,
      });
    }
  }, [customGraphicsLoaded, customGraphics, matchState, setMatchState]);

  // The same for a line-up screen: removing a team's last player while its
  // line-up is on air (or an undo bringing back a line-up screen for a team
  // that no longer has one) takes it off air instead of leaving an empty
  // output. Not an undo step either: it follows the settings.
  useEffect(() => {
    const reconciled = reconcileLineupScreen(
      matchState.displayScreen,
      matchSettings
    );
    if (reconciled) setMatchState(reconciled);
  }, [matchState.displayScreen, matchSettings, setMatchState]);

  // Match shortcuts (both the focused-window set and the system-wide Alt set)
  // are paused only while the operator is typing: focus in a text field
  // anywhere in the control window, or the shortcut recorder. They used to be
  // paused for as long as any side menu was open, so leaving System Settings
  // open (e.g. showing the phone QR code) silently killed every hotkey,
  // including the global ones pressed from OBS. When the control window loses
  // focus, the global set must work again even if a field still holds focus,
  // so window blur re-enables them. Evaluated after the focus event settles
  // (moving between two fields fires focusout then focusin) and only sends
  // IPC on an actual change.
  useEffect(() => {
    let shortcutsPaused = false;
    // Set by the window blur/focus events; document.hasFocus() is read at
    // evaluation time as well so a window that mounted unfocused is handled.
    let windowBlurred = false;
    let pending: ReturnType<typeof setTimeout> | undefined;

    const apply = () => {
      pending = undefined;
      const shouldPause =
        !windowBlurred &&
        document.hasFocus() &&
        isTextEntryTarget(document.activeElement);
      if (shouldPause === shortcutsPaused) return;
      shortcutsPaused = shouldPause;
      if (shouldPause) {
        window?.electronAPI?.disableKeyboardShortcuts();
      } else {
        window?.electronAPI?.enableKeyboardShortcuts();
      }
    };
    const schedule = () => {
      if (pending === undefined) pending = setTimeout(apply, 0);
    };
    const handleWindowFocus = () => {
      windowBlurred = false;
      schedule();
    };
    const handleWindowBlur = () => {
      windowBlurred = true;
      schedule();
    };

    document.addEventListener('focusin', schedule);
    document.addEventListener('focusout', schedule);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('blur', handleWindowBlur);
    return () => {
      document.removeEventListener('focusin', schedule);
      document.removeEventListener('focusout', schedule);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('blur', handleWindowBlur);
      if (pending !== undefined) clearTimeout(pending);
      if (shortcutsPaused) window?.electronAPI?.enableKeyboardShortcuts();
    };
  }, []);

  // App-level (renderer window) undo/redo shortcuts, active while the control
  // window has focus. Deliberately separate from the global-OS accelerators
  // registered in main.ts. Mount-only: the handler reads undo/redo fresh from
  // the store's getState() so it never closes over stale references, and the
  // listener is torn down on unmount so a remount can't double-bind.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key.toLowerCase() !== 'z') return;

      // Inside a text field, leave the browser's native text undo/redo alone
      // rather than hijacking Ctrl/Cmd+Z for the match. Check both the event
      // target and the active element so a keydown that bubbles up from an
      // editable element is still recognised.
      if (
        isTextEntryTarget(event.target) ||
        isTextEntryTarget(document.activeElement)
      ) {
        return;
      }

      event.preventDefault();
      if (event.shiftKey) {
        useUndoStore.getState().redo();
      } else {
        useUndoStore.getState().undo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchScreens = async () => {
    try {
      const storedScreens = await window?.electronAPI?.getCustomScreens();
      setCustomGraphics(storedScreens || []);
      setCustomGraphicsLoaded(true);
    } catch (error) {
      console.error('Failed to fetch custom screens:', error);
    }
  };

  const openSideMenu = (sideMenu: SideMenuType) => {
    setSideMenu(sideMenu);
  };

  const closeSideMenu = () => {
    setSideMenu(null);
  };

  const updateAppSettings = (settingsUpdated: Partial<AppSettings>) => {
    const updatedSettings = {
      ...appSettings,
      ...settingsUpdated,
    };
    setAppSettings(updatedSettings);
    window?.electronAPI?.updateAppSettings(updatedSettings);
  };

  // The operator's match actions (goals, the goal log, penalties, the clock
  // and phases, screen switches, settings changes, restoring or starting a
  // match) live in @playoverlay/core, so every PlayOverlay app behaves the
  // same way. They are rebuilt each render, like the inline handlers they
  // replaced, and read fresh state from the stores, so the mount-time
  // shortcut and phone listeners above can safely keep the first render's
  // copies. Any action that supersedes the offer to restore a previous match
  // clears it here.
  const {
    updateMatchSettings,
    replaceMatchSettings,
    restoreMatch,
    setGoalScorer,
    removeGoal,
    showGoalBanner,
    startNewMatch: resetToNewMatch,
    setPenalties,
    incrementHomeTeamScore,
    incrementAwayTeamScore,
    decrementHomeTeamScore,
    decrementAwayTeamScore,
    updateScore,
    toggleClock,
    switchDisplayScreen,
    setDisplayScreen,
    handleStartPhase,
    handleStopClock,
    handlePauseClock,
    handleResumeClock,
    handleAdjustTime,
    handleSetAdditionalTime,
    nextMatchPhase,
  } = createMatchActions(clock, {
    onOperatorAction: () => setRestorableMatch(null),
  });

  const startNewMatch = () => {
    resetToNewMatch();
    if (restorableMatch) {
      // Choosing a new match is choosing not to restore the previous one.
      window?.electronAPI?.resolveLiveMatch();
      setRestorableMatch(null);
    }
    setNewMatchOpen(false);
  };

  return (
    <>
      <div className="select-none">
        <DashboardHeader
          setSideMenu={openSideMenu}
          onNewMatch={() => setNewMatchOpen(true)}
        />
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
              <div className="mx-4 mb-4 lg:mx-auto">
                <button
                  type="button"
                  onClick={() => setPreflightOpen(true)}
                  className="flex w-full items-center justify-center gap-x-2 rounded-md bg-green-600 px-4 py-3 text-sm font-semibold text-white shadow hover:bg-green-500"
                >
                  <RocketLaunchIcon className="h-5 w-5" aria-hidden="true" />
                  {t('preflight:action.openButton')}
                </button>
              </div>
              <DisplayControlsPanel
                updateMatchState={setMatchState}
                switchScreen={switchDisplayScreen}
                matchState={matchState}
                customGraphics={customGraphics}
                matchSettings={matchSettings}
              />
              <ScreenRotationPanel
                settings={getScreenRotationSettings(appSettings)}
                updateSettings={(screenRotation) =>
                  updateAppSettings({ screenRotation })
                }
                matchSettings={matchSettings}
                customGraphics={customGraphics}
                rotating={rotating}
                start={() => useScreenRotationStore.getState().start()}
                stop={() => useScreenRotationStore.getState().stop()}
              />
            </div>
          </div>
          <div className="lg:h-screen lg:overflow-y-auto lg:p-4">
            <TimeControlPanel
              time={time}
              matchSettings={matchSettings}
              pause={handlePauseClock}
              resume={handleResumeClock}
              adjustTime={handleAdjustTime}
              isPaused={clock.paused}
              setAdditionalTime={handleSetAdditionalTime}
              startTime={handleStartPhase}
              stopTime={handleStopClock}
              autoSwitchScreens={appSettings.autoSwitchScreens}
              setAutoSwitchScreens={(autoSwitchScreens: boolean) =>
                updateAppSettings({ autoSwitchScreens })
              }
            />
            <ScoresPanel
              matchSettings={matchSettings}
              scores={scores}
              time={time}
              incrementHomeTeamScore={incrementHomeTeamScore}
              incrementAwayTeamScore={incrementAwayTeamScore}
              updateScore={updateScore}
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
                onUndo={undo}
                canUndo={canUndo}
              />
            )}
            <GoalLogPanel
              goals={scores.goals ?? []}
              matchSettings={matchSettings}
              showBannerAutomatically={
                appSettings.showGoalBannerAutomatically !== false
              }
              setShowBannerAutomatically={(showGoalBannerAutomatically) =>
                updateAppSettings({ showGoalBannerAutomatically })
              }
              setScorer={setGoalScorer}
              showBanner={showGoalBanner}
              removeGoal={removeGoal}
            />
          </div>
        </main>
        <MatchSettingsMenu
          sidebarOpen={sideMenu === 'team-settings'}
          setSidebarOpen={closeSideMenu}
          matchSettings={matchSettings}
          updateMatchSettings={updateMatchSettings}
          replaceMatchSettings={replaceMatchSettings}
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
          stopTime={handleStopClock}
          matchSettings={matchSettings}
          startTime={handleStartPhase}
          updateMatchState={switchDisplayScreen}
          matchState={matchState}
          time={time}
          appSettings={appSettings}
          updateAppSettings={updateAppSettings}
        />
        <PreflightModal open={preflightOpen} setOpen={setPreflightOpen} />
        <Modal
          open={newMatchOpen}
          setOpen={setNewMatchOpen}
          title={t('dashboard:newMatch.modalTitle')}
          actionButtonLabel={t('dashboard:newMatch.confirm')}
          actionButtonColor="indigo"
          icon="warning"
          action={startNewMatch}
        >
          <p className="text-sm text-gray-500">
            {t('dashboard:newMatch.modalBody')}
          </p>
        </Modal>
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
              <img
                className="h-8 w-auto"
                src={logo}
                alt={t('common:logoAlt')}
              />
            }
            buttonOnClick={() => restoreMatch(restorableMatch)}
            buttonText={t('settings:matchMenu.saved.restore')}
            onClose={() => {
              // Dismissed without restoring: let the main process replace the
              // protected snapshot with the current state so it isn't offered
              // again next launch.
              window?.electronAPI?.resolveLiveMatch();
              setRestorableMatch(null);
            }}
          />
        )}
        {updateStatus?.newVersionAvailable && (
          <AppNotification
            title={t('dashboard:notifications.updateAvailable.title')}
            text={t('dashboard:notifications.updateAvailable.body', {
              version: updateStatus?.latestVersion,
            })}
            icon={
              <img
                className="h-8 w-auto"
                src={logo}
                alt={t('common:logoAlt')}
              />
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
