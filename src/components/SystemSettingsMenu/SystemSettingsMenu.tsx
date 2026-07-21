import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { Trans, useTranslation } from 'react-i18next';
import SideMenu from '../SideMenu/SideMenu';
import {
  chunkArray,
  classNames,
  deriveGlobalAccelerator,
  getBrowserSourceSettings,
  getKeyboardShortcuts,
  getLanguage,
  getPhaseList,
  getPhaseTitle,
  getRemoteControlSettings,
} from '../../utils';
import Modal from '../Modal/Modal';
import { MatchSettings } from '../../zodSchemas';
import { connectToStreamDeck, NEXT_SET_KEY_INDEX } from '../../stream-deck';
import {
  AppSettings,
  KeyboardShortcuts,
  MatchPhase,
  MatchState,
  RemoteControlStatus,
  Time,
} from '../../types';
import {
  DisplayScreen,
  defaultKeyboardShortcuts,
  screens,
  supportedLanguages,
} from '../../constants';
import StreamDeckIcon from '../Icons/StreamDeckIcon';
import { Switch } from '@headlessui/react';
import ButtonGrid from '../ButtonGrid/ButtonGrid';
import CollapsiblePanel from '../CollapsiblePanel/CollapsiblePanel';
import KeyboardShortcutRow from './KeyboardShortcutRow';

export interface Props {
  open: boolean;
  matchSettings: MatchSettings;
  setOpen: () => void;
  incrementHomeTeamScore: () => void;
  incrementAwayTeamScore: () => void;
  startTime: (matchPhase: MatchPhase) => void;
  stopTime: () => void;
  updateMatchState: (settingsUpdated: Partial<MatchState>) => void;
  matchState: MatchState;
  time: Time;
  appSettings: AppSettings;
  updateAppSettings: (updatedSettings: Partial<AppSettings>) => void;
}

export type Modals = null | 'about';

export default function SystemSettingsMenu({
  open,
  setOpen,
  matchSettings,
  incrementHomeTeamScore,
  incrementAwayTeamScore,
  startTime,
  stopTime,
  updateMatchState,
  time,
  appSettings,
  updateAppSettings,
}: Props) {
  const { t } = useTranslation();
  const [currentModal, setCurrentModal] = useState<Modals>(null);
  const [streamDeckConnected, setStreamDeckConnected] = useState(false);
  const [streamDeckButtons, setStreamdeckButtons] = useState(0);
  const [recordingAction, setRecordingAction] = useState<
    keyof KeyboardShortcuts | null
  >(null);
  const [shortcutConflictError, setShortcutConflictError] = useState<
    string | null
  >(null);
  const [browserSourceStatus, setBrowserSourceStatus] = useState<{
    running: boolean;
    port: number;
    error?: string;
  } | null>(null);
  const [copiedBrowserSourceUrl, setCopiedBrowserSourceUrl] = useState(false);
  const [copiedScoreboardUrl, setCopiedScoreboardUrl] = useState(false);
  const [remoteControlStatus, setRemoteControlStatus] =
    useState<RemoteControlStatus | null>(null);
  const [remoteControlQr, setRemoteControlQr] = useState<string | null>(null);
  const [copiedRemoteControlUrl, setCopiedRemoteControlUrl] = useState(false);

  const keyboardShortcuts = getKeyboardShortcuts(appSettings);
  const browserSource = getBrowserSourceSettings(appSettings);
  const remoteControl = getRemoteControlSettings(appSettings);

  const shortcutLabels: Record<keyof KeyboardShortcuts, string> = {
    nextMatchPhase: t('settings:appMenu.keyboardShortcuts.nextMatchPhase'),
    homeTeamScored: t('settings:appMenu.keyboardShortcuts.homeTeamScored'),
    awayTeamScored: t('settings:appMenu.keyboardShortcuts.awayTeamScored'),
  };

  const [browserSourcePortDraft, setBrowserSourcePortDraft] = useState(
    String(browserSource.port)
  );
  const [browserSourcePortError, setBrowserSourcePortError] = useState<
    string | null
  >(null);

  const [remoteControlPortDraft, setRemoteControlPortDraft] = useState(
    String(remoteControl.port)
  );
  const [remoteControlPortError, setRemoteControlPortError] = useState<
    string | null
  >(null);

  // Keep the draft in sync when settings change from outside this input
  // (e.g. loaded from disk, or committed by this same component).
  useEffect(() => {
    setBrowserSourcePortDraft(String(browserSource.port));
    setBrowserSourcePortError(null);
  }, [browserSource.port]);

  const refreshBrowserSourceStatus = () => {
    if (!window?.electronAPI) return;
    window.electronAPI
      .getBrowserSourceStatus()
      .then((status) => {
        setBrowserSourceStatus(status);
      })
      .catch(() => {
        // Ignore; the status line just won't update this time.
      });
  };

  useEffect(() => {
    refreshBrowserSourceStatus();
  }, []);

  // Keep the remote-control port draft in sync when settings change from
  // outside this input.
  useEffect(() => {
    setRemoteControlPortDraft(String(remoteControl.port));
    setRemoteControlPortError(null);
  }, [remoteControl.port]);

  const refreshRemoteControlStatus = () => {
    if (!window?.electronAPI) return;
    window.electronAPI
      .getRemoteControlStatus()
      .then((status) => {
        setRemoteControlStatus(status);
      })
      .catch(() => {
        // Ignore; the status line just won't update this time.
      });
  };

  // Poll once on mount, then keep the status (running state, PIN, and
  // connected-phone count) live via the pushed remote-control-status events
  // the main process emits when a phone pairs or drops.
  useEffect(() => {
    refreshRemoteControlStatus();
    const unsubscribe = window?.electronAPI?.onRemoteControlStatus(
      setRemoteControlStatus
    );
    return () => unsubscribe?.();
  }, []);

  // Regenerate the QR code whenever the running URL changes. Only when running
  // (a stale URL for a stopped server would just point nowhere). The data URL
  // is generated in the renderer so it needs no packaged asset.
  useEffect(() => {
    if (!remoteControlStatus?.running || !remoteControlStatus.url) {
      setRemoteControlQr(null);
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(remoteControlStatus.url, { margin: 1, width: 220 })
      .then((dataUrl) => {
        if (!cancelled) setRemoteControlQr(dataUrl);
      })
      .catch((error) => {
        console.error('Failed to generate remote control QR code:', error);
        if (!cancelled) setRemoteControlQr(null);
      });
    return () => {
      cancelled = true;
    };
  }, [remoteControlStatus?.running, remoteControlStatus?.url]);

  const handleStartRecordingShortcut = (action: keyof KeyboardShortcuts) => {
    setShortcutConflictError(null);
    setRecordingAction(action);
  };

  const handleCancelRecordingShortcut = () => {
    setShortcutConflictError(null);
    setRecordingAction(null);
  };

  // The effective bindings a candidate accelerator must be checked against:
  // an action's base accelerator plus its derived system-wide (Alt-added)
  // variant, since either one colliding with another action is a real
  // conflict (e.g. while OBS is focused).
  const effectiveAccelerators = (accelerator: string): string[] => {
    const globalVariant = deriveGlobalAccelerator(accelerator);
    return globalVariant ? [accelerator, globalVariant] : [accelerator];
  };

  // Shared by both the manual re-record flow and the reset-to-default flow:
  // a candidate accelerator (or its derived global variant) conflicts if it
  // matches any other action's base or derived-global accelerator.
  const findShortcutConflict = (
    action: keyof KeyboardShortcuts,
    candidateAccelerator: string
  ): keyof KeyboardShortcuts | undefined => {
    const candidateVariants = effectiveAccelerators(candidateAccelerator);

    return (
      Object.keys(keyboardShortcuts) as Array<keyof KeyboardShortcuts>
    ).find((otherAction) => {
      if (otherAction === action) return false;
      const otherVariants = effectiveAccelerators(
        keyboardShortcuts[otherAction]
      );
      return candidateVariants.some((variant) =>
        otherVariants.includes(variant)
      );
    });
  };

  const handleChangeShortcut = (
    action: keyof KeyboardShortcuts,
    accelerator: string
  ) => {
    const conflictingAction = findShortcutConflict(action, accelerator);

    if (conflictingAction) {
      setShortcutConflictError(
        t('settings:appMenu.keyboardShortcuts.conflict', {
          label: shortcutLabels[conflictingAction],
        })
      );
      return;
    }

    setShortcutConflictError(null);
    updateAppSettings({
      keyboardShortcuts: { ...keyboardShortcuts, [action]: accelerator },
    });
    setRecordingAction(null);
  };

  const handleResetShortcut = (action: keyof KeyboardShortcuts) => {
    const defaultAccelerator = defaultKeyboardShortcuts[action];
    const conflictingAction = findShortcutConflict(action, defaultAccelerator);

    if (conflictingAction) {
      // Surface the conflict the same way a manual re-record would, by
      // attaching it to this action's recording row, instead of silently
      // applying a default that collides with another shortcut.
      setRecordingAction(action);
      setShortcutConflictError(
        t('settings:appMenu.keyboardShortcuts.conflict', {
          label: shortcutLabels[conflictingAction],
        })
      );
      return;
    }

    setShortcutConflictError(null);
    updateAppSettings({
      keyboardShortcuts: {
        ...keyboardShortcuts,
        [action]: defaultAccelerator,
      },
    });
  };

  const handleToggleBrowserSource = (enabled: boolean) => {
    updateAppSettings({ browserSource: { ...browserSource, enabled } });
    // The server (re)starts asynchronously in the main process; give it a
    // moment before checking whether it actually came up.
    setTimeout(refreshBrowserSourceStatus, 400);
  };

  const handleBrowserSourcePortChange = (port: number) => {
    updateAppSettings({ browserSource: { ...browserSource, port } });
    setTimeout(refreshBrowserSourceStatus, 400);
  };

  // Only persist (and restart the server) once the user has finished typing
  // a valid port, committing on every keystroke would restart the server
  // on partial values like "4" or "47".
  const commitBrowserSourcePort = () => {
    const parsedPort = Number(browserSourcePortDraft);
    if (
      !Number.isInteger(parsedPort) ||
      parsedPort < 1024 ||
      parsedPort > 65535
    ) {
      setBrowserSourcePortError(t('settings:appMenu.browserSource.portError'));
      return;
    }
    setBrowserSourcePortError(null);
    if (parsedPort !== browserSource.port) {
      handleBrowserSourcePortChange(parsedPort);
    }
  };

  const handleToggleRemoteControl = (enabled: boolean) => {
    updateAppSettings({ remoteControl: { ...remoteControl, enabled } });
    // The server (re)starts asynchronously in the main process; give it a
    // moment before checking whether it actually came up.
    setTimeout(refreshRemoteControlStatus, 400);
  };

  const handleRemoteControlPortChange = (port: number) => {
    updateAppSettings({ remoteControl: { ...remoteControl, port } });
    setTimeout(refreshRemoteControlStatus, 400);
  };

  // Only persist (and restart the server) once a valid port has been entered,
  // matching the browser source port field.
  const commitRemoteControlPort = () => {
    const parsedPort = Number(remoteControlPortDraft);
    if (
      !Number.isInteger(parsedPort) ||
      parsedPort < 1024 ||
      parsedPort > 65535
    ) {
      setRemoteControlPortError(t('settings:appMenu.remoteControl.portError'));
      return;
    }
    setRemoteControlPortError(null);
    if (parsedPort !== remoteControl.port) {
      handleRemoteControlPortChange(parsedPort);
    }
  };

  const handleCopyRemoteControlUrl = () => {
    if (!remoteControlStatus?.url) return;
    navigator.clipboard
      .writeText(remoteControlStatus.url)
      .then(() => {
        setCopiedRemoteControlUrl(true);
        setTimeout(() => setCopiedRemoteControlUrl(false), 1500);
      })
      .catch((error) => {
        console.error('Failed to copy remote control URL:', error);
      });
  };

  const browserSourceUrl = `http://127.0.0.1:${browserSource.port}/`;
  const scoreboardBrowserSourceUrl = `http://127.0.0.1:${browserSource.port}/?screen=scoreboard`;

  const handleCopyBrowserSourceUrl = () => {
    navigator.clipboard
      .writeText(browserSourceUrl)
      .then(() => {
        setCopiedBrowserSourceUrl(true);
        setTimeout(() => setCopiedBrowserSourceUrl(false), 1500);
      })
      .catch((error) => {
        console.error('Failed to copy browser source URL:', error);
      });
  };

  const handleCopyScoreboardUrl = () => {
    navigator.clipboard
      .writeText(scoreboardBrowserSourceUrl)
      .then(() => {
        setCopiedScoreboardUrl(true);
        setTimeout(() => setCopiedScoreboardUrl(false), 1500);
      })
      .catch((error) => {
        console.error('Failed to copy scoreboard browser source URL:', error);
      });
  };

  const scoringButtons = [
    {
      text: t('settings:system.teamScored', {
        team: matchSettings.homeTeamNameFull,
      }),
      // Same fallback hex values as defaultMatchSettings; that constant's
      // fields are optional per the MatchSettings type, so referencing it
      // directly wouldn't narrow away `undefined` here.
      textColor: matchSettings.homeTeamTextColour ?? '#ffffff',
      backgroundColor: matchSettings.homeTeamBackgroundColour ?? '#cc0000',
      onPress: incrementHomeTeamScore,
    },
    {
      text: t('settings:system.teamScored', {
        team: matchSettings.awayTeamNameFull,
      }),
      textColor: matchSettings.awayTeamTextColour ?? '#ffffff',
      backgroundColor: matchSettings.awayTeamBackgroundColour ?? '#0000cc',
      onPress: incrementAwayTeamScore,
    },
    {
      text: t('settings:system.stop'),
      textColor: 'white',
      backgroundColor: 'red',
      onPress: () => stopTime(),
    },
  ];

  const phaseButtons = getPhaseList(matchSettings).map((phase) => ({
    text: getPhaseTitle(t, phase),
    onPress: () => startTime(phase.id),
    textColor: 'black',
    backgroundColor: time.matchPhase === phase.id ? '#86EFAC' : 'white',
  }));

  // Local i18n key map (rather than translating the `screens` constant
  // directly): `screens` is shared with DisplayControlsPanel, which this
  // file's owner doesn't touch, so the translation lookup stays here.
  const screenLabelKeys: Record<DisplayScreen, string> = {
    none: 'settings:system.screens.none',
    matchTitle: 'settings:system.screens.matchTitle',
    scoreBug: 'settings:system.screens.scoreBug',
    penalties: 'settings:system.screens.penalties',
    custom: 'settings:system.screens.custom',
    endScreen: 'settings:system.screens.endScreen',
    scoreboard: 'settings:system.screens.scoreboard',
  };

  const screenButtons = Object.keys(screens)
    .filter((screen) => screen !== 'custom')
    .filter(
      (screen) => matchSettings.hasPenalties !== false || screen !== 'penalties'
    )
    .map((screen) => ({
      text: t(screenLabelKeys[screen as DisplayScreen]),
      textColor: 'black',
      backgroundColor: 'white',
      onPress: () =>
        updateMatchState({
          displayScreen: screen as DisplayScreen,
          customScreenImageUrl: undefined,
        }),
    }));

  // Deck buttons are limited to NEXT_SET_KEY_INDEX usable keys per set (the
  // key after that is the "next set" logo key), so phases and screens page
  // across as many sets as they need instead of silently dropping the tail
  // (generic mode can have dozens of phases; screens now include scoreboard).
  const streamDeckButtonSets = [
    scoringButtons,
    ...chunkArray(phaseButtons, NEXT_SET_KEY_INDEX),
    ...chunkArray(screenButtons, NEXT_SET_KEY_INDEX),
  ];

  // The number of sets shrinks when settings change (fewer phases, penalties
  // toggled off). A page index saved while there were more sets must clamp
  // to the current range, or the deck redraw would index undefined and
  // silently disconnect mid-match.
  const activeButtonSet = Math.min(
    streamDeckButtons,
    streamDeckButtonSets.length - 1
  );

  const nextButtonSet = () => {
    setStreamdeckButtons((prevButtons) => {
      const nextButtons =
        prevButtons + 1 >= streamDeckButtonSets.length ? 0 : prevButtons + 1;
      console.log('Updating buttons:', prevButtons, 'to', nextButtons);
      return nextButtons;
    });
  };

  const handleNextButtonSet = () => {
    nextButtonSet();
  };

  useEffect(() => {
    if (streamDeckConnected) {
      connectToStreamDeck(
        streamDeckButtonSets[activeButtonSet],
        handleNextButtonSet
      ).catch((error: unknown) => {
        console.error('Failed to update Stream Deck:', error);
        setStreamDeckConnected(false);
      });
    }
    // time.matchPhase (not the whole ticking time object) so the phase
    // highlight updates without redrawing the deck every second.
    // streamDeckButtonSets/handleNextButtonSet are rebuilt from these same
    // deps on every render (not memoized), so including them would make this
    // effect refire on every unrelated re-render and redraw the deck needlessly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamDeckButtons, streamDeckConnected, matchSettings, time.matchPhase]);

  return (
    <>
      <SideMenu
        open={open}
        setOpen={setOpen}
        title={t('settings:system.title')}
      >
        <CollapsiblePanel title={t('settings:language.title')}>
          <p className="mb-3 text-sm text-gray-500">
            {t('settings:language.description')}
          </p>
          <ButtonGrid
            compact
            buttons={supportedLanguages.map(({ code, label }) => ({
              label,
              onClick: () => updateAppSettings({ language: code }),
              selected: getLanguage(appSettings) === code,
            }))}
          />
        </CollapsiblePanel>
        <CollapsiblePanel title={t('settings:appMenu.scoreboardClock.title')}>
          <p className="mb-3 text-sm text-gray-500">
            {t('settings:appMenu.scoreboardClock.description')}
          </p>
          <ButtonGrid
            compact
            buttons={[
              {
                label: t('settings:appMenu.scoreboardClock.twentyFourHour'),
                onClick: () => updateAppSettings({ clockFormat: '24h' }),
                selected: (appSettings.clockFormat ?? '24h') === '24h',
              },
              {
                label: t('settings:appMenu.scoreboardClock.amPm'),
                onClick: () => updateAppSettings({ clockFormat: '12h' }),
                selected: appSettings.clockFormat === '12h',
              },
            ]}
          />
        </CollapsiblePanel>
        <CollapsiblePanel title={t('settings:appMenu.keyboardShortcuts.title')}>
          <div className="divide-y divide-gray-100">
            <KeyboardShortcutRow
              label={shortcutLabels.nextMatchPhase}
              accelerator={keyboardShortcuts.nextMatchPhase}
              isRecording={recordingAction === 'nextMatchPhase'}
              onStartRecording={() =>
                handleStartRecordingShortcut('nextMatchPhase')
              }
              onCancelRecording={handleCancelRecordingShortcut}
              onChange={(accelerator) =>
                handleChangeShortcut('nextMatchPhase', accelerator)
              }
              onReset={() => handleResetShortcut('nextMatchPhase')}
              isDefault={
                keyboardShortcuts.nextMatchPhase ===
                defaultKeyboardShortcuts.nextMatchPhase
              }
              externalError={
                recordingAction === 'nextMatchPhase'
                  ? shortcutConflictError
                  : null
              }
            />
            <KeyboardShortcutRow
              label={shortcutLabels.homeTeamScored}
              accelerator={keyboardShortcuts.homeTeamScored}
              isRecording={recordingAction === 'homeTeamScored'}
              onStartRecording={() =>
                handleStartRecordingShortcut('homeTeamScored')
              }
              onCancelRecording={handleCancelRecordingShortcut}
              onChange={(accelerator) =>
                handleChangeShortcut('homeTeamScored', accelerator)
              }
              onReset={() => handleResetShortcut('homeTeamScored')}
              isDefault={
                keyboardShortcuts.homeTeamScored ===
                defaultKeyboardShortcuts.homeTeamScored
              }
              externalError={
                recordingAction === 'homeTeamScored'
                  ? shortcutConflictError
                  : null
              }
            />
            <KeyboardShortcutRow
              label={shortcutLabels.awayTeamScored}
              accelerator={keyboardShortcuts.awayTeamScored}
              isRecording={recordingAction === 'awayTeamScored'}
              onStartRecording={() =>
                handleStartRecordingShortcut('awayTeamScored')
              }
              onCancelRecording={handleCancelRecordingShortcut}
              onChange={(accelerator) =>
                handleChangeShortcut('awayTeamScored', accelerator)
              }
              onReset={() => handleResetShortcut('awayTeamScored')}
              isDefault={
                keyboardShortcuts.awayTeamScored ===
                defaultKeyboardShortcuts.awayTeamScored
              }
              externalError={
                recordingAction === 'awayTeamScored'
                  ? shortcutConflictError
                  : null
              }
            />
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {t('settings:appMenu.keyboardShortcuts.globalHint')}
          </p>
        </CollapsiblePanel>
        <CollapsiblePanel title={t('settings:appMenu.browserSource.title')}>
          <Switch.Group as="div" className="mt-2 flex items-center">
            <Switch
              checked={browserSource.enabled}
              onChange={handleToggleBrowserSource}
              className={classNames(
                browserSource.enabled ? 'bg-indigo-600' : 'bg-gray-200',
                'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2'
              )}
            >
              <span
                aria-hidden="true"
                className={classNames(
                  browserSource.enabled ? 'translate-x-5' : 'translate-x-0',
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out'
                )}
              />
            </Switch>
            <Switch.Label as="span" className="ml-3 text-sm">
              <span className="font-medium text-gray-900">
                {t('settings:appMenu.browserSource.enable')}
              </span>
            </Switch.Label>
          </Switch.Group>
          <label
            htmlFor="browserSourcePort"
            className="mt-3 block text-sm font-medium leading-6 text-gray-900"
          >
            {t('settings:appMenu.browserSource.port')}
          </label>
          <div className="mt-1">
            <input
              type="number"
              name="browserSourcePort"
              id="browserSourcePort"
              min={1024}
              max={65535}
              className="block w-28 rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              value={browserSourcePortDraft}
              onChange={(event) => {
                setBrowserSourcePortDraft(event.target.value);
              }}
              onBlur={commitBrowserSourcePort}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  commitBrowserSourcePort();
                }
              }}
            />
            {browserSourcePortError && (
              <p className="mt-1 text-xs text-red-600">
                {browserSourcePortError}
              </p>
            )}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {browserSourceStatus?.error
              ? t('settings:appMenu.browserSource.statusWithError', {
                  state: browserSourceStatus?.running
                    ? t('settings:appMenu.browserSource.statusRunning')
                    : t('settings:appMenu.browserSource.statusStopped'),
                  error: browserSourceStatus.error,
                })
              : t('settings:appMenu.browserSource.status', {
                  state: browserSourceStatus?.running
                    ? t('settings:appMenu.browserSource.statusRunning')
                    : t('settings:appMenu.browserSource.statusStopped'),
                })}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="overflow-x-auto rounded bg-gray-100 px-2 py-1 text-xs">
              {browserSourceUrl}
            </code>
            <button
              type="button"
              onClick={handleCopyBrowserSourceUrl}
              className="shrink-0 rounded-md bg-indigo-600 px-2 py-1 text-xs font-semibold text-white hover:bg-indigo-500"
            >
              {copiedBrowserSourceUrl
                ? t('settings:appMenu.browserSource.copied')
                : t('settings:appMenu.browserSource.copy')}
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {t('settings:appMenu.browserSource.hint')}
          </p>
          <label
            htmlFor="scoreboardBrowserSourceUrl"
            className="mt-3 block text-sm font-medium leading-6 text-gray-900"
          >
            {t('settings:appMenu.browserSource.scoreboardView')}
          </label>
          <div className="mt-1 flex items-center gap-2">
            <code
              id="scoreboardBrowserSourceUrl"
              className="overflow-x-auto rounded bg-gray-100 px-2 py-1 text-xs"
            >
              {scoreboardBrowserSourceUrl}
            </code>
            <button
              type="button"
              onClick={handleCopyScoreboardUrl}
              className="shrink-0 rounded-md bg-indigo-600 px-2 py-1 text-xs font-semibold text-white hover:bg-indigo-500"
            >
              {copiedScoreboardUrl
                ? t('settings:appMenu.browserSource.copied')
                : t('settings:appMenu.browserSource.copy')}
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            <Trans
              i18nKey="settings:appMenu.browserSource.customScreenHint"
              components={{ code: <code /> }}
            />
          </p>
        </CollapsiblePanel>
        <CollapsiblePanel title={t('settings:appMenu.remoteControl.title')}>
          <Switch.Group as="div" className="mt-2 flex items-center">
            <Switch
              checked={remoteControl.enabled}
              onChange={handleToggleRemoteControl}
              className={classNames(
                remoteControl.enabled ? 'bg-indigo-600' : 'bg-gray-200',
                'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2'
              )}
            >
              <span
                aria-hidden="true"
                className={classNames(
                  remoteControl.enabled ? 'translate-x-5' : 'translate-x-0',
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out'
                )}
              />
            </Switch>
            <Switch.Label as="span" className="ml-3 text-sm">
              <span className="font-medium text-gray-900">
                {t('settings:appMenu.remoteControl.enable')}
              </span>
            </Switch.Label>
          </Switch.Group>
          <label
            htmlFor="remoteControlPort"
            className="mt-3 block text-sm font-medium leading-6 text-gray-900"
          >
            {t('settings:appMenu.remoteControl.port')}
          </label>
          <div className="mt-1">
            <input
              type="number"
              name="remoteControlPort"
              id="remoteControlPort"
              min={1024}
              max={65535}
              className="block w-28 rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              value={remoteControlPortDraft}
              onChange={(event) => {
                setRemoteControlPortDraft(event.target.value);
              }}
              onBlur={commitRemoteControlPort}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  commitRemoteControlPort();
                }
              }}
            />
            {remoteControlPortError && (
              <p className="mt-1 text-xs text-red-600">
                {remoteControlPortError}
              </p>
            )}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {remoteControlStatus?.error
              ? t('settings:appMenu.remoteControl.statusWithError', {
                  state: remoteControlStatus?.running
                    ? t('settings:appMenu.remoteControl.statusRunning')
                    : t('settings:appMenu.remoteControl.statusStopped'),
                  error: remoteControlStatus.error,
                })
              : t('settings:appMenu.remoteControl.status', {
                  state: remoteControlStatus?.running
                    ? t('settings:appMenu.remoteControl.statusRunning')
                    : t('settings:appMenu.remoteControl.statusStopped'),
                })}
          </p>
          {remoteControlStatus?.running && (
            <>
              <div className="mt-2 flex items-center gap-2">
                <code className="overflow-x-auto rounded bg-gray-100 px-2 py-1 text-xs">
                  {remoteControlStatus.url}
                </code>
                <button
                  type="button"
                  onClick={handleCopyRemoteControlUrl}
                  className="shrink-0 rounded-md bg-indigo-600 px-2 py-1 text-xs font-semibold text-white hover:bg-indigo-500"
                >
                  {copiedRemoteControlUrl
                    ? t('settings:appMenu.remoteControl.copied')
                    : t('settings:appMenu.remoteControl.copy')}
                </button>
              </div>
              <p className="mt-2 text-sm font-medium text-gray-900">
                {t('settings:appMenu.remoteControl.pinLabel', {
                  pin: remoteControlStatus.pin,
                })}
              </p>
              {remoteControlQr && (
                <img
                  src={remoteControlQr}
                  alt={t('settings:appMenu.remoteControl.qrAlt')}
                  className="mt-2 h-40 w-40 rounded bg-white p-1"
                />
              )}
              <p className="mt-2 text-xs text-gray-500">
                {t('settings:appMenu.remoteControl.connected', {
                  count: remoteControlStatus.connectedCount,
                })}
              </p>
            </>
          )}
          <p className="mt-2 text-xs text-gray-500">
            {t('settings:appMenu.remoteControl.hint')}
          </p>
        </CollapsiblePanel>
        <ul role="list" className="-mx-2 space-y-1 px-4">
          <li>
            <button
              className="group flex w-full gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
              onClick={() => {
                setCurrentModal('about');
                setOpen();
              }}
            >
              <InformationCircleIcon
                className={classNames(
                  'text-gray-400 group-hover:text-indigo-600',
                  'h-6 w-6 shrink-0'
                )}
                aria-hidden="true"
              />
              {t('settings:system.about')}
            </button>
          </li>
          <li>
            <button
              className="group flex w-full gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
              onClick={async () => {
                if (streamDeckConnected) return;
                try {
                  await connectToStreamDeck(
                    streamDeckButtonSets[activeButtonSet],
                    handleNextButtonSet
                  );
                  setStreamDeckConnected(true);
                } catch (error) {
                  console.error('Failed to connect to Stream Deck:', error);
                }
              }}
            >
              <StreamDeckIcon
                className={classNames(
                  'text-gray-400 group-hover:text-indigo-600',
                  'h-6 w-6 shrink-0'
                )}
                aria-hidden="true"
              />
              {streamDeckConnected
                ? t('settings:system.streamDeckConnected')
                : t('settings:system.connectStreamDeck')}
            </button>
          </li>
        </ul>
      </SideMenu>
      <Modal
        open={currentModal === 'about'}
        setOpen={() => setCurrentModal(null)}
        title={t('settings:system.aboutModal.title')}
        icon="playoverlay-logo"
      >
        <div className="mt-6 border-t border-gray-100">
          <dl className="divide-y divide-gray-100">
            <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm font-medium leading-6 text-gray-900">
                {t('settings:system.aboutModal.product')}
              </dt>
              <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                PlayOverlay
              </dd>
            </div>
            <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm font-medium leading-6 text-gray-900">
                {t('settings:system.aboutModal.version')}
              </dt>
              <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                {window?.electronAPI?.getVersion()}
              </dd>
            </div>
          </dl>
        </div>
      </Modal>
    </>
  );
}
