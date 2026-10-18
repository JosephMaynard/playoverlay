import { PencilIcon } from '@heroicons/react/24/outline';
import { Trans, useTranslation } from 'react-i18next';
import {
  Time,
  getPhaseById,
  getPhaseTitle,
  MatchSettings,
} from '@playoverlay/core';
import IconButton from '../ui/IconButton';

export interface Props {
  time: Time;
  matchSettings: MatchSettings;
  openAdjustmentsModal?: () => void;
}

// The clock as the operator sees it: large enough to read from arm's
// length with a camera in the other hand. Always on the ink block, in both
// themes, so it looks like the on-air clock and not like a form field.
// The digits scale with the panel's own width (container units) rather
// than the viewport, because on a 1024px tablet the panel is barely half
// the screen and viewport-based sizes ran the two clocks into each other.
export default function TimeDisplay({
  time,
  matchSettings,
  openAdjustmentsModal,
}: Props) {
  const { t } = useTranslation();
  const currentPhase = time.matchPhase
    ? getPhaseById(matchSettings, time.matchPhase)
    : undefined;
  return (
    <div className="relative flex min-h-32 flex-col items-center justify-center bg-ink px-4 py-3 text-ink-fg [container-type:inline-size]">
      {time.time ? (
        <div className="grid w-full grid-cols-[minmax(0,6fr)_minmax(0,5fr)] items-center gap-4">
          <p className="min-w-0 text-center font-semibold tabular-nums leading-none [font-size:clamp(3rem,15cqw,5.5rem)]">
            {time.time}
          </p>
          <div className="flex flex-col items-center justify-center">
            {currentPhase && (
              <p className="mb-1 text-center text-sm font-semibold uppercase tracking-wide text-ink-fg/70">
                {getPhaseTitle(t, currentPhase)}
              </p>
            )}
            {time.remainingTime && (
              <p className="min-w-0 text-center font-normal tabular-nums leading-none [font-size:clamp(1.75rem,9cqw,3.5rem)]">
                {time.remainingTime}
              </p>
            )}
            {time.additionalTime && (
              <p className="mt-2 text-center text-sm text-ink-fg/80">
                <Trans
                  i18nKey="screens:timeDisplay.additionalTime"
                  values={{ minutes: time.additionalTime }}
                  components={{
                    bold: <span className="font-semibold tabular-nums" />,
                  }}
                />
              </p>
            )}
          </div>
        </div>
      ) : (
        <p className="text-center text-3xl font-semibold text-ink-fg/70 sm:text-4xl">
          {t('screens:timeDisplay.notRunning')}
        </p>
      )}
      {openAdjustmentsModal && time.time && (
        <IconButton
          label={t('dashboard:timeControl.adjustTimeModalTitle')}
          icon={<PencilIcon className="h-6 w-6" aria-hidden="true" />}
          className="absolute right-2 top-2 text-ink-fg/70 hover:bg-white/10 hover:text-ink-fg"
          onClick={() => openAdjustmentsModal()}
        />
      )}
    </div>
  );
}
