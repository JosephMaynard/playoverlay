import { useEffect, useState } from 'react';
import { AppSettings, Display, KeyboardShortcuts } from '../../types';
import { defaultKeyboardShortcuts } from '../../constants';
import {
  classNames,
  deriveGlobalAccelerator,
  getBrowserSourceSettings,
  getKeyboardShortcuts,
} from '../../utils';
import { Switch } from '@headlessui/react';
import ButtonGrid from '../ButtonGrid/ButtonGrid';
import ColourPicker from '../ColorPicker/ColorPicker';
import {
  ArrowsPointingOutIcon,
  LockClosedIcon,
  LockOpenIcon,
} from '@heroicons/react/24/outline';
import SideMenu from '../SideMenu/SideMenu';
import KeyboardShortcutRow from './KeyboardShortcutRow';

export interface Props {
  open: boolean;
  setOpen: () => void;
  appSettings: AppSettings;
  updateAppSettings: (updatedSettings: Partial<AppSettings>) => void;
}

export default function AppSettingsMenu({
  open,
  setOpen,
  appSettings,
  updateAppSettings,
}: Props) {
  const [displays, setDisplays] = useState<Display[]>([]);
  const [isLocked, setIsLocked] = useState(false);
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

  const keyboardShortcuts = getKeyboardShortcuts(appSettings);
  const browserSource = getBrowserSourceSettings(appSettings);

  const shortcutLabels: Record<keyof KeyboardShortcuts, string> = {
    nextMatchPhase: 'Next match phase',
    homeTeamScored: 'Home team scored',
    awayTeamScored: 'Away team scored',
  };

  const [browserSourcePortDraft, setBrowserSourcePortDraft] = useState(
    String(browserSource.port)
  );
  const [browserSourcePortError, setBrowserSourcePortError] = useState<
    string | null
  >(null);

  // Keep the draft in sync when settings change from outside this input
  // (e.g. loaded from disk, or committed by this same component).
  useEffect(() => {
    setBrowserSourcePortDraft(String(browserSource.port));
    setBrowserSourcePortError(null);
  }, [browserSource.port]);

  useEffect(() => {
    // Request initial screens information on component mount
    window?.electronAPI?.getScreenInfo();

    // Set up the listener for when the screens information is updated
    const cleanupScreensInfo = window?.electronAPI?.onScreenInfo(setDisplays);
    // Set up the listener for dynamic display changes
    const cleanupDisplayChange =
      window?.electronAPI?.onDisplayChange(setDisplays);

    // Fetch initial lock status
    window?.electronAPI?.getLockStatus();
    // Set up the listener for dynamic display changes
    const cleanupLockStatus = window?.electronAPI?.onLockStatus(setIsLocked);

    // Cleanup both listeners when the component unmounts
    return () => {
      cleanupScreensInfo();
      cleanupDisplayChange();
      cleanupLockStatus();
    };
  }, []);

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

  const handleMoveWindow = (screenId: number) => {
    window?.electronAPI?.moveWindowToScreen(screenId);
  };

  const handleLockWindows = () => {
    window?.electronAPI?.lockWindows();
    setIsLocked(true);
  };

  const handleUnlockWindows = () => {
    window?.electronAPI?.unlockWindows();
    setIsLocked(false);
  };

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
        `Already used by "${shortcutLabels[conflictingAction]}".`
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
        `Already used by "${shortcutLabels[conflictingAction]}".`
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
  // a valid port — committing on every keystroke would restart the server
  // on partial values like "4" or "47".
  const commitBrowserSourcePort = () => {
    const parsedPort = Number(browserSourcePortDraft);
    if (
      !Number.isInteger(parsedPort) ||
      parsedPort < 1024 ||
      parsedPort > 65535
    ) {
      setBrowserSourcePortError('Enter a port between 1024 and 65535.');
      return;
    }
    setBrowserSourcePortError(null);
    if (parsedPort !== browserSource.port) {
      handleBrowserSourcePortChange(parsedPort);
    }
  };

  const browserSourceUrl = `http://127.0.0.1:${browserSource.port}/`;

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

  return (
    <SideMenu open={open} setOpen={setOpen} title="Window Settings">
      <div className="my-4 max-w-64 rounded-md border border-gray-200 bg-white p-4 shadow">
        <ColourPicker
          label="Key Colour"
          onChange={(keyColour: string) => {
            updateAppSettings({ keyColour });
          }}
          value={appSettings.keyColour}
          disabled={isLocked}
        />
      </div>
      <div className="my-4 max-w-md rounded-md border border-gray-200 bg-white p-4 shadow">
        <h3 className="mb-2 text-base font-semibold leading-6 text-gray-900">
          Scoreboard Clock
        </h3>
        <p className="mb-3 text-sm text-gray-500">
          Time-of-day format on the spectator scoreboard screen.
        </p>
        <ButtonGrid
          compact
          buttons={[
            {
              label: '24-hour',
              onClick: () => updateAppSettings({ clockFormat: '24h' }),
              selected: (appSettings.clockFormat ?? '24h') === '24h',
            },
            {
              label: 'AM/PM',
              onClick: () => updateAppSettings({ clockFormat: '12h' }),
              selected: appSettings.clockFormat === '12h',
            },
          ]}
        />
      </div>
      <div className="my-4 max-w-md rounded-md border border-gray-200 bg-white p-4 shadow">
        <h3 className="text-sm font-semibold text-gray-900">
          Keyboard Shortcuts
        </h3>
        <div className="divide-y divide-gray-100">
          <KeyboardShortcutRow
            label="Next match phase"
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
            label="Home team scored"
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
            label="Away team scored"
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
          Each shortcut also works system-wide (e.g. while OBS is focused)
          with Alt added, unless the shortcut already includes Alt.
        </p>
      </div>
      <div className="my-4 max-w-md rounded-md border border-gray-200 bg-white p-4 shadow">
        <h3 className="text-sm font-semibold text-gray-900">
          OBS Browser Source
        </h3>
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
            <span className="font-medium text-gray-900">Enable</span>
          </Switch.Label>
        </Switch.Group>
        <label
          htmlFor="browserSourcePort"
          className="mt-3 block text-sm font-medium leading-6 text-gray-900"
        >
          Port
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
          Status:{' '}
          {browserSourceStatus?.running ? 'Running' : 'Stopped'}
          {browserSourceStatus?.error ? ` — ${browserSourceStatus.error}` : ''}
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
            {copiedBrowserSourceUrl ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Add as a Browser Source in OBS at your canvas resolution; the
          background is transparent.
        </p>
      </div>
      {displays.length > 1 ? (
        <ButtonGrid
          compact
          className="mt-4"
          buttons={[
            ...displays.map((display, index) => ({
              label: `Move to Screen ${index + 1}`,
              onClick: () => handleMoveWindow(display.id),
              disabled: isLocked,
              icon: (
                <ArrowsPointingOutIcon
                  className="-ml-0.5 h-5 w-5"
                  aria-hidden="true"
                />
              ),
            })),
          ]}
        />
      ) : (
        <p className="my-12">No external displays detected.</p>
      )}
      <ButtonGrid
        className="mt-4"
        buttons={[
          {
            label: 'Toggle Fullscreen',
            onClick: () => window?.electronAPI?.toggleFullscreen(),
            color: 'text-white',
            backgroundColor: 'bg-indigo-600',
            disabled: isLocked,
          },
          {
            label: 'Reset positions',
            onClick: () => window?.electronAPI?.resetWindows(),
            color: 'text-white',
            backgroundColor: 'bg-indigo-600',
            disabled: isLocked,
          },
          {
            label: isLocked ? 'Unlock Windows' : 'Lock Windows',
            onClick: isLocked ? handleUnlockWindows : handleLockWindows,
            color: 'text-white',
            backgroundColor: isLocked ? 'bg-red-600' : 'bg-green-600',
            icon: isLocked ? (
              <LockOpenIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
            ) : (
              <LockClosedIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
            ),
          },
        ]}
      />
    </SideMenu>
  );
}
