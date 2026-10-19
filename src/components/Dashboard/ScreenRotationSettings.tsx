import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CustomScreen,
  MatchSettings,
  MAX_ROTATION_INTERVAL_SECONDS,
  MIN_ROTATION_INTERVAL_SECONDS,
  ScreenRotationEntry,
  ScreenRotationSettings as RotationSettings,
  availableRotationEntries,
  classNames,
  rotationCandidates,
  sameRotationEntry,
  setRotationEntry,
} from '@playoverlay/core';
import WideModal from '../Modal/WideModal';
import ActionButton from '../ui/ActionButton';
import Toggle from '../ui/Toggle';
import {
  checkboxClassName,
  errorTextClassName,
  inputClassName,
  labelClassName,
} from '../ui/fields';
import { screenLabelKeys } from './DisplayControlsPanel';

export interface Props {
  open: boolean;
  setOpen: (open: boolean) => void;
  settings: RotationSettings;
  updateSettings: (settings: RotationSettings) => void;
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
      <label htmlFor="rotation-seconds" className={labelClassName}>
        {t('dashboard:rotation.seconds')}
      </label>
      {/* The width lives on a wrapper: inputClassName carries w-full,
          which would override a w-28 on the field itself. */}
      <div className="mt-2 w-28">
        <input
          type="number"
          id="rotation-seconds"
          min={MIN_ROTATION_INTERVAL_SECONDS}
          max={MAX_ROTATION_INTERVAL_SECONDS}
          step={1}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? 'rotation-seconds-error' : undefined}
          className={inputClassName}
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
      </div>
      {invalid && (
        <p id="rotation-seconds-error" className={errorTextClassName}>
          {t('dashboard:rotation.secondsError', {
            min: MIN_ROTATION_INTERVAL_SECONDS,
            max: MAX_ROTATION_INTERVAL_SECONDS,
          })}
        </p>
      )}
    </div>
  );
}

// Set-up for "Rotate screens": choose the screens the display cycles
// through on its own before kick-off or at half-time, so the operator can
// put the laptop down. The screens rotate in the order listed. Opened from
// the gear beside the Rotate key in Display Controls; nothing here changes
// the display until Start (or the half-time option) is used.
export default function ScreenRotationSettings({
  open,
  setOpen,
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
    <WideModal
      open={open}
      setOpen={setOpen}
      title={t('dashboard:rotation.title')}
    >
      <p className="mb-4 text-sm text-muted">
        {t('dashboard:rotation.description')}
      </p>
      <fieldset className="mb-4">
        <legend className={labelClassName}>
          {t('dashboard:rotation.screens')}
        </legend>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {candidates.map((entry, index) => {
            const id =
              entry.screen === 'custom'
                ? `rotation-custom-${index}`
                : `rotation-${entry.screen}`;
            return (
              // The whole row is the label, so a tap anywhere on it ticks
              // the box rather than only the 24px square.
              <label
                key={id}
                htmlFor={id}
                className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-3 ring-1 ring-inset ring-line hover:bg-surface-2"
              >
                <input
                  id={id}
                  type="checkbox"
                  className={classNames(checkboxClassName, 'flex-shrink-0')}
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
                <span className="min-w-0 truncate text-base text-fg">
                  {label(entry)}
                </span>
              </label>
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
      <Toggle
        checked={settings.autoStartAtHalfTime}
        onChange={(autoStartAtHalfTime: boolean) =>
          updateSettings({ ...settings, autoStartAtHalfTime })
        }
        label={t('dashboard:rotation.autoStart')}
        description={t('dashboard:rotation.autoStartHint')}
      />
      <div className="mt-5">
        <ActionButton
          variant={rotating ? 'danger' : 'live'}
          size="lg"
          block
          disabled={!rotating && !canStart}
          aria-describedby={
            !rotating && !canStart ? 'rotation-need-two' : undefined
          }
          onClick={rotating ? stop : start}
        >
          {rotating
            ? t('dashboard:rotation.stop')
            : t('dashboard:rotation.start')}
        </ActionButton>
        {!rotating && !canStart && (
          <p id="rotation-need-two" className="mt-2 text-sm text-muted">
            {t('dashboard:rotation.needTwo')}
          </p>
        )}
      </div>
    </WideModal>
  );
}
