import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Switch } from '@headlessui/react';
import {
  CustomScreen,
  MatchSettings,
  MAX_ROTATION_INTERVAL_SECONDS,
  MIN_ROTATION_INTERVAL_SECONDS,
  ScreenRotationEntry,
  ScreenRotationSettings,
  availableRotationEntries,
  classNames,
  rotationCandidates,
  sameRotationEntry,
  setRotationEntry,
} from '@playoverlay/core';
import CollapsiblePanel from '../CollapsiblePanel/CollapsiblePanel';
import { screenLabelKeys } from './DisplayControlsPanel';

export interface Props {
  settings: ScreenRotationSettings;
  updateSettings: (settings: ScreenRotationSettings) => void;
  matchSettings: MatchSettings;
  customGraphics: CustomScreen[];
  rotating: boolean;
  start: () => void;
  stop: () => void;
}

function parseSeconds(value: string): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) &&
    parsed >= MIN_ROTATION_INTERVAL_SECONDS &&
    parsed <= MAX_ROTATION_INTERVAL_SECONDS
    ? parsed
    : null;
}

// Seconds per screen. Commits on blur or Enter, like the match settings'
// number fields, so typing "15" never briefly applies "1"; a value out of
// range keeps the typed text with an error beside it and changes nothing.
function SecondsInput({
  value,
  commit,
}: {
  value: number;
  commit: (seconds: number) => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    setDraft(null);
    setInvalid(false);
  }, [value]);

  const handleCommit = () => {
    if (draft === null) return;
    const seconds = parseSeconds(draft);
    if (seconds === null) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setDraft(null);
    if (seconds !== value) commit(seconds);
  };

  return (
    <div className="mb-4">
      <label
        htmlFor="rotation-seconds"
        className="block text-sm font-medium leading-6 text-gray-900"
      >
        {t('dashboard:rotation.seconds')}
      </label>
      <input
        type="number"
        id="rotation-seconds"
        min={MIN_ROTATION_INTERVAL_SECONDS}
        max={MAX_ROTATION_INTERVAL_SECONDS}
        step={1}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? 'rotation-seconds-error' : undefined}
        className="mt-2 block w-28 rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
        value={draft ?? String(value)}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={handleCommit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            handleCommit();
          }
        }}
      />
      {invalid && (
        <p id="rotation-seconds-error" className="mt-1 text-xs text-red-600">
          {t('dashboard:rotation.secondsError', {
            min: MIN_ROTATION_INTERVAL_SECONDS,
            max: MAX_ROTATION_INTERVAL_SECONDS,
          })}
        </p>
      )}
    </div>
  );
}

// "Rotate screens": choose screens for the display to cycle through on its
// own before kick-off or at half-time, so the operator can put the laptop
// down. The screens rotate in the order listed. Collapsed by default, and
// nothing here changes the display until Start (or the half-time option)
// is used.
export default function ScreenRotationPanel({
  settings,
  updateSettings,
  matchSettings,
  customGraphics,
  rotating,
  start,
  stop,
}: Props) {
  const { t } = useTranslation();
  const candidates = rotationCandidates(matchSettings, customGraphics);
  const canStart =
    availableRotationEntries(settings, matchSettings, customGraphics).length >=
    2;

  const label = (entry: ScreenRotationEntry) =>
    entry.screen === 'custom'
      ? (customGraphics.find(
          (graphic) => graphic.url === entry.customScreenImageUrl
        )?.title ?? '')
      : t(screenLabelKeys[entry.screen]);

  return (
    <CollapsiblePanel
      title={t('dashboard:rotation.title')}
      defaultOpen={false}
      badge={
        rotating ? (
          <span className="inline-flex items-center rounded-md bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
            {t('dashboard:rotation.rotating')}
          </span>
        ) : undefined
      }
    >
      <p className="mb-4 text-sm text-gray-500">
        {t('dashboard:rotation.description')}
      </p>
      <fieldset className="mb-4">
        <legend className="text-sm font-medium leading-6 text-gray-900">
          {t('dashboard:rotation.screens')}
        </legend>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {candidates.map((entry, index) => {
            const id =
              entry.screen === 'custom'
                ? `rotation-custom-${index}`
                : `rotation-${entry.screen}`;
            return (
              <div className="relative flex items-start" key={id}>
                <div className="flex h-6 items-center">
                  <input
                    id={id}
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                    checked={settings.screens.some((chosen) =>
                      sameRotationEntry(chosen, entry)
                    )}
                    onChange={(event) =>
                      updateSettings({
                        ...settings,
                        screens: setRotationEntry(
                          settings.screens,
                          entry,
                          event.target.checked,
                          customGraphics
                        ),
                      })
                    }
                  />
                </div>
                <label
                  htmlFor={id}
                  className="ml-3 min-w-0 truncate text-sm leading-6 text-gray-900"
                >
                  {label(entry)}
                </label>
              </div>
            );
          })}
        </div>
      </fieldset>
      <SecondsInput
        value={settings.intervalSeconds}
        commit={(intervalSeconds) =>
          updateSettings({ ...settings, intervalSeconds })
        }
      />
      <Switch.Group as="div" className="mb-1 flex items-center">
        <Switch
          checked={settings.autoStartAtHalfTime}
          onChange={(autoStartAtHalfTime: boolean) =>
            updateSettings({ ...settings, autoStartAtHalfTime })
          }
          className={classNames(
            settings.autoStartAtHalfTime ? 'bg-indigo-600' : 'bg-gray-200',
            'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2'
          )}
        >
          <span
            aria-hidden="true"
            className={classNames(
              settings.autoStartAtHalfTime ? 'translate-x-5' : 'translate-x-0',
              'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out'
            )}
          />
        </Switch>
        <Switch.Label as="span" className="ml-3 text-sm">
          <span className="font-medium text-gray-900">
            {t('dashboard:rotation.autoStart')}
          </span>
        </Switch.Label>
      </Switch.Group>
      <p className="mb-4 text-sm text-gray-500">
        {t('dashboard:rotation.autoStartHint')}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
          disabled={!rotating && !canStart}
          aria-describedby={
            !rotating && !canStart ? 'rotation-need-two' : undefined
          }
          onClick={rotating ? stop : start}
        >
          {rotating
            ? t('dashboard:rotation.stop')
            : t('dashboard:rotation.start')}
        </button>
        {!rotating && !canStart && (
          <p id="rotation-need-two" className="text-sm text-gray-500">
            {t('dashboard:rotation.needTwo')}
          </p>
        )}
      </div>
    </CollapsiblePanel>
  );
}
