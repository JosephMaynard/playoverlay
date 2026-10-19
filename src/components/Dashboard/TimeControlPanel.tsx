import { PlayIcon, PauseIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import {
  Time,
  MatchPhase,
  MatchPeriod,
  Scores,
  classNames,
  getPhaseList,
  getPhaseTitle,
  isValidAdditionalTime,
  MatchSettings,
} from '@playoverlay/core';
import ButtonGrid from '../ButtonGrid/ButtonGrid';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import WideModal from '../Modal/WideModal';
import TimeDisplay from '../TimeDisplay/TimeDisplay';
import ActionButton, { actionButtonClasses } from '../ui/ActionButton';
import Toggle from '../ui/Toggle';
import { inputClassName } from '../ui/fields';

export interface Props {
  time: Time;
  matchSettings: MatchSettings;
  scores?: Scores;
  onEditScore?: () => void;
  // The phase that would start next (first phase before kick-off, the one
  // after the phase that just ended at a break), or undefined once the
  // match has run out of phases or while one is running.
  nextPhase?: MatchPeriod;
  pause: () => void;
  resume: () => void;
  adjustTime: (difference: number) => void;
  isPaused: boolean;
  setAdditionalTime: (additionalTime?: number) => void;
  startTime: (matchPhase: MatchPhase) => void;
  stopTime: () => void;
  autoSwitchScreens: boolean;
  setAutoSwitchScreens: (autoSwitchScreens: boolean) => void;
}

const adjustSteps: {
  seconds: number;
  kind: 'minutes' | 'seconds';
  n: number;
}[] = [
  { seconds: -600, kind: 'minutes', n: 10 },
  { seconds: -60, kind: 'minutes', n: 1 },
  { seconds: -10, kind: 'seconds', n: 10 },
  { seconds: -1, kind: 'seconds', n: 1 },
  { seconds: 1, kind: 'seconds', n: 1 },
  { seconds: 10, kind: 'seconds', n: 10 },
  { seconds: 60, kind: 'minutes', n: 1 },
  { seconds: 600, kind: 'minutes', n: 10 },
];

// The clock block, pinned at the top of the dashboard for the whole match:
// the clock itself, Start and Stop, and Added time. Everything else to do
// with the clock (jumping to a phase, nudging the time, pausing, the
// auto-switch setting) sits behind one key in a pop-up, because a late
// start or a correction is rare and can cost a tap, while the time left is
// what the operator gets asked for all match.
export default function TimeControlPanel({
  time,
  matchSettings,
  scores,
  onEditScore,
  nextPhase,
  pause,
  resume,
  adjustTime,
  isPaused,
  setAdditionalTime,
  startTime,
  stopTime,
  autoSwitchScreens,
  setAutoSwitchScreens,
}: Props) {
  const { t } = useTranslation();
  const [additionalTimeOpen, setAdditionalTimeOpen] = useState(false);
  // Typed additional time, committed on blur or Enter rather than per
  // keystroke: typing "10" would otherwise put "+1" on air first and record
  // two undo entries. null means "not editing": show the live value.
  const [draftAdditionalTime, setDraftAdditionalTime] = useState<string | null>(
    null
  );
  const commitDraftAdditionalTime = () => {
    if (draftAdditionalTime === null) return;
    const typed = draftAdditionalTime.trim();
    setDraftAdditionalTime(null);
    if (typed === '') {
      if (time.additionalTime !== undefined) setAdditionalTime();
      return;
    }
    // Whole minutes only: "-2" or "2.5" would render on air as "+ -2" and
    // "+2.5". Anything else is discarded and the field shows the live value.
    const minutes = Number(typed);
    if (!isValidAdditionalTime(minutes)) return;
    if (minutes !== time.additionalTime) setAdditionalTime(minutes);
  };

  // Starting/stopping a phase's auto-switch-screens behaviour is handled by
  // startTime/stopTime themselves (centralised in useMatchClock); this
  // panel just triggers them.
  const running = time.matchPhase !== undefined;
  const phaseButtons = getPhaseList(matchSettings).map((phase) => ({
    label: getPhaseTitle(t, phase),
    onClick: () => startTime(phase.id),
    selected: time.matchPhase === phase.id,
  }));

  return (
    <section
      aria-label={t('dashboard:timeControl.title')}
      // Stretches to the preview's height beside it, with the ink block
      // taking the spare room, so the two pinned panels share one bottom edge.
      className="flex flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-sm lg:h-full"
    >
      <TimeDisplay
        time={time}
        matchSettings={matchSettings}
        scores={scores}
        onEditScore={onEditScore}
      />
      <div className="flex flex-col gap-3 p-4">
        {/* The two things that happen at the touchline: start the coming
            phase, stop the running one. Both are always there, one of them
            live, so the thumb learns one place. */}
        <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-3">
          <ActionButton
            variant="live"
            size="xl"
            className="min-h-20"
            disabled={running || !nextPhase}
            onClick={() => nextPhase && startTime(nextPhase.id)}
            icon={<PlayIcon className="h-6 w-6" aria-hidden="true" />}
          >
            {nextPhase
              ? t('dashboard:timeControl.start', {
                  phase: getPhaseTitle(t, nextPhase),
                })
              : t('dashboard:timeControl.startPlain')}
          </ActionButton>
          <ActionButton
            variant="danger"
            size="xl"
            className="min-h-20"
            disabled={!running}
            onClick={() => stopTime()}
          >
            {t('settings:system.stop')}
          </ActionButton>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <ActionButton
            variant="secondary"
            aria-label={t('dashboard:timeControl.setAdditionalTime')}
            onClick={() => setAdditionalTimeOpen(true)}
          >
            {time.additionalTime
              ? `${t('dashboard:timeControl.addedTime')}: +${time.additionalTime}`
              : t('dashboard:timeControl.addedTime')}
          </ActionButton>
          <Popover>
            <PopoverButton
              className={actionButtonClasses({
                variant: 'secondary',
                block: true,
              })}
            >
              {t('dashboard:timeControl.phasesAndClock')}
              <ChevronDownIcon className="h-5 w-5" aria-hidden="true" />
            </PopoverButton>
            <PopoverPanel
              anchor="bottom end"
              transition
              className="z-40 w-[min(32rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface p-4 shadow-xl transition duration-150 ease-out [--anchor-gap:8px] data-[closed]:scale-95 data-[closed]:opacity-0"
            >
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                {t('dashboard:timeControl.allPhases')}
              </p>
              {/* Every phase stays one tap away for a late start or a
                  restart after a mistake; the running one is lit green. */}
              <ButtonGrid
                buttons={phaseButtons}
                columns={2}
                selectedTone="go"
              />
              <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-muted">
                {t('dashboard:timeControl.adjustTimeModalTitle')}
              </p>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                {adjustSteps.map((step) => (
                  <ActionButton
                    key={step.seconds}
                    size="sm"
                    disabled={!time.time}
                    onClick={() => adjustTime(step.seconds)}
                  >
                    {t(
                      step.kind === 'minutes'
                        ? 'dashboard:timeControl.adjustMinutes'
                        : 'dashboard:timeControl.adjustSeconds',
                      { sign: step.seconds < 0 ? '-' : '+', n: step.n }
                    )}
                  </ActionButton>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <Toggle
                  checked={autoSwitchScreens}
                  onChange={setAutoSwitchScreens}
                  label={t('dashboard:timeControl.autoSwitchLabel')}
                />
                {isPaused ? (
                  <ActionButton
                    variant="live"
                    disabled={!time.time}
                    onClick={() => resume()}
                    icon={<PlayIcon className="h-5 w-5" aria-hidden="true" />}
                  >
                    {t('dashboard:timeControl.resume')}
                  </ActionButton>
                ) : (
                  <ActionButton
                    variant="secondary"
                    disabled={!time.time}
                    onClick={() => pause()}
                    icon={<PauseIcon className="h-5 w-5" aria-hidden="true" />}
                  >
                    {t('dashboard:timeControl.pause')}
                  </ActionButton>
                )}
              </div>
            </PopoverPanel>
          </Popover>
        </div>
      </div>
      <WideModal
        open={additionalTimeOpen}
        setOpen={() => {
          commitDraftAdditionalTime();
          setAdditionalTimeOpen(false);
        }}
        title={t('dashboard:timeControl.setAdditionalTime')}
      >
        <label htmlFor="additionalTime" className="sr-only">
          {t('dashboard:timeControl.additionalTimeLabel')}
        </label>
        <div className="mb-4 mt-2 flex gap-2">
          <input
            type="number"
            name="additionalTime"
            id="additionalTime"
            className={classNames(inputClassName, 'text-center text-xl')}
            min={1}
            step={1}
            onChange={(e) => setDraftAdditionalTime(e.target.value)}
            onBlur={commitDraftAdditionalTime}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                commitDraftAdditionalTime();
                setAdditionalTimeOpen(false);
              }
            }}
            value={draftAdditionalTime ?? time.additionalTime ?? ''}
          />
          <ActionButton
            aria-label={t('dashboard:timeControl.clear')}
            icon={<XMarkIcon className="h-6 w-6" aria-hidden="true" />}
            onClick={() => {
              setDraftAdditionalTime(null);
              setAdditionalTime();
            }}
          />
        </div>
        <ButtonGrid
          buttons={[
            ...Array.from(new Array(17)).map((_, index) => ({
              label: t('dashboard:timeControl.additionalTimeMinutes', {
                n: index + 1,
              }),
              onClick: () => {
                setDraftAdditionalTime(null);
                setAdditionalTime(index + 1);
                setAdditionalTimeOpen(false);
              },
            })),
            {
              label: t('dashboard:timeControl.clear'),
              onClick: () => {
                setDraftAdditionalTime(null);
                setAdditionalTime();
                setAdditionalTimeOpen(false);
              },
              variant: 'danger' as const,
            },
          ]}
        />
      </WideModal>
    </section>
  );
}
