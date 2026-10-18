import { PlayIcon, PauseIcon, XMarkIcon } from '@heroicons/react/24/solid';
import {
  Time,
  MatchPhase,
  MatchPeriod,
  classNames,
  getPhaseList,
  getPhaseTitle,
  isValidAdditionalTime,
  MatchSettings,
} from '@playoverlay/core';
import CollapsiblePanel from '../CollapsiblePanel/CollapsiblePanel';
import ButtonGrid from '../ButtonGrid/ButtonGrid';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import WideModal from '../Modal/WideModal';
import TimeDisplay from '../TimeDisplay/TimeDisplay';
import ActionButton from '../ui/ActionButton';
import Toggle from '../ui/Toggle';
import { inputClassName } from '../ui/fields';

export interface Props {
  time: Time;
  matchSettings: MatchSettings;
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

export default function TimeControlPanel({
  time,
  matchSettings,
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
  const [modal, setModal] = useState<
    'adjustTime' | 'additionalTime' | undefined
  >();
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
    <CollapsiblePanel
      title={t('dashboard:timeControl.title')}
      badge={
        running ? (
          <span className="rounded-md bg-live-soft px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-live-ink">
            {t('dashboard:timeControl.running')}
          </span>
        ) : undefined
      }
      noPanelPadding
    >
      <TimeDisplay
        time={time}
        matchSettings={matchSettings}
        openAdjustmentsModal={() => setModal('adjustTime')}
      />
      <div className="flex flex-col gap-4 p-4">
        {/* The two things that happen at the touchline: start the coming
            phase, stop the running one. Both are always there, one of them
            live, so the thumb learns one place. The full phase list stays
            below for jumping around (a late start, a restart after a
            mistake), but it is not what a thumb reaches for. */}
        <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-2">
          <ActionButton
            variant="live"
            size="xl"
            disabled={running || !nextPhase}
            onClick={() => nextPhase && startTime(nextPhase.id)}
            icon={<PlayIcon className="h-6 w-6" aria-hidden="true" />}
          >
            {nextPhase
              ? t('dashboard:timeControl.start', {
                  phase: getPhaseTitle(t, nextPhase),
                })
              : t('dashboard:timeControl.start', { phase: '' }).trim()}
          </ActionButton>
          <ActionButton
            variant="danger"
            size="xl"
            disabled={!running}
            onClick={() => stopTime()}
          >
            {t('settings:system.stop')}
          </ActionButton>
        </div>
        <ActionButton
          variant="secondary"
          block
          aria-label={t('dashboard:timeControl.setAdditionalTime')}
          onClick={() => setModal('additionalTime')}
        >
          {time.additionalTime
            ? `${t('dashboard:timeControl.addedTime')}: +${time.additionalTime}`
            : t('dashboard:timeControl.addedTime')}
        </ActionButton>
        {/* Every phase stays one tap away for a late start or a restart
            after a mistake, but at the small size and in one row, so the
            goal buttons below are still on screen on a tablet. */}
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
            {t('dashboard:timeControl.allPhases')}
          </p>
          <ButtonGrid buttons={phaseButtons} columns={4} size="sm" />
        </div>
        <Toggle
          checked={autoSwitchScreens}
          onChange={setAutoSwitchScreens}
          label={t('dashboard:timeControl.autoSwitchLabel')}
        />
      </div>
      <WideModal
        open={modal === 'additionalTime'}
        setOpen={() => {
          commitDraftAdditionalTime();
          setModal(undefined);
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
                setModal(undefined);
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
                setModal(undefined);
              },
            })),
            {
              label: t('dashboard:timeControl.clear'),
              onClick: () => {
                setDraftAdditionalTime(null);
                setAdditionalTime();
                setModal(undefined);
              },
              variant: 'danger' as const,
            },
          ]}
        />
      </WideModal>
      <WideModal
        open={modal === 'adjustTime'}
        setOpen={() => {
          setModal(undefined);
        }}
        title={t('dashboard:timeControl.adjustTimeModalTitle')}
      >
        <div className="overflow-hidden rounded-xl">
          <TimeDisplay time={time} matchSettings={matchSettings} />
        </div>
        <div className="mt-6 grid grid-cols-4 gap-2 sm:grid-cols-[repeat(4,minmax(0,1fr))_auto_repeat(4,minmax(0,1fr))]">
          {adjustSteps.slice(0, 4).map((step) => (
            <ActionButton
              key={step.seconds}
              disabled={!time.time}
              onClick={() => adjustTime(step.seconds)}
            >
              {t(
                step.kind === 'minutes'
                  ? 'dashboard:timeControl.adjustMinutes'
                  : 'dashboard:timeControl.adjustSeconds',
                { sign: '-', n: step.n }
              )}
            </ActionButton>
          ))}
          <div className="col-span-4 flex justify-center sm:col-span-1">
            {isPaused ? (
              <ActionButton
                variant="live"
                disabled={!time.time}
                aria-label={t('dashboard:timeControl.resume')}
                icon={<PlayIcon className="h-6 w-6" aria-hidden="true" />}
                onClick={() => resume()}
              />
            ) : (
              <ActionButton
                variant="primary"
                disabled={!time.time}
                aria-label={t('dashboard:timeControl.pause')}
                icon={<PauseIcon className="h-6 w-6" aria-hidden="true" />}
                onClick={() => pause()}
              />
            )}
          </div>
          {adjustSteps.slice(4).map((step) => (
            <ActionButton
              key={step.seconds}
              disabled={!time.time}
              onClick={() => adjustTime(step.seconds)}
            >
              {t(
                step.kind === 'minutes'
                  ? 'dashboard:timeControl.adjustMinutes'
                  : 'dashboard:timeControl.adjustSeconds',
                { sign: '+', n: step.n }
              )}
            </ActionButton>
          ))}
        </div>
      </WideModal>
    </CollapsiblePanel>
  );
}
