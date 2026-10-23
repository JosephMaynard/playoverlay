import { useTranslation } from 'react-i18next';
import {
  Time,
  Scores,
  classNames,
  getPhaseById,
  getPhaseTitle,
  MatchSettings,
} from '@playoverlay/core';
import { ScoresTeamName } from '@playoverlay/screens';

export interface Props {
  time: Time;
  matchSettings: MatchSettings;
  // With scores, the block also shows the score beside the phase; tapping
  // it opens the score editor (the only place the score is edited by hand).
  scores?: Scores;
  onEditScore?: () => void;
}

// Average advance of a bold tabular digit, and the added time's size, both
// in ems of the clock. The colon and minus are narrower than a digit, so
// counting them as one keeps a little to spare.
const CHARACTER_WIDTH_EM = 0.62;
const ADDED_TIME_EM = 0.32;

// The clock's font size: as large as fits the width its column has left
// beside the remaining time, up to 8rem. Sized from the text itself so
// 105:13 with +5 in extra time still fits where 45:00 did. Never sized for
// fewer than five characters, so the digits do not shrink at 9:59 -> 10:00
// and the only step down a match ever sees is at 100 minutes.
export function clockFontSize(clock: string, additionalTime?: number) {
  let widthEm = Math.max(clock.length, 5) * CHARACTER_WIDTH_EM;
  if (additionalTime) {
    // The gap, the plus sign and the minutes.
    widthEm +=
      0.15 +
      (String(additionalTime).length + 1) * CHARACTER_WIDTH_EM * ADDED_TIME_EM;
  }
  return `clamp(2rem, ${(100 / widthEm).toFixed(1)}cqw, 8rem)`;
}

// The clock block as the operator sees it: phase, running state, score,
// the match clock large enough to read from arm's length with a camera in
// the other hand, and the time remaining, which is what spectators keep
// asking. Always on the ink block in both themes so it reads like the
// on-air clock and not like a form field. The digits scale with the width
// their own column has (container units) rather than the viewport, because
// on a 1024px tablet the block is barely half the screen.
export default function TimeDisplay({
  time,
  matchSettings,
  scores,
  onEditScore,
}: Props) {
  const { t } = useTranslation();
  const currentPhase = time.matchPhase
    ? getPhaseById(matchSettings, time.matchPhase)
    : undefined;
  const running = time.matchPhase !== undefined;
  const clock = time.time ?? '0:00';
  const status = !running
    ? t('screens:timeDisplay.notRunning')
    : time.paused
      ? t('dashboard:timeControl.paused')
      : t('dashboard:timeControl.running');

  return (
    <div className="flex flex-1 flex-col justify-center gap-2 bg-ink px-5 py-4 text-ink-fg [container-type:inline-size]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {currentPhase && (
            <span className="truncate text-xs font-semibold uppercase tracking-[0.12em] text-ink-fg/70">
              {getPhaseTitle(t, currentPhase)}
            </span>
          )}
          <span
            className={classNames(
              'inline-flex flex-shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em]',
              running && !time.paused
                ? 'bg-live-soft text-live-ink'
                : 'bg-white/10 text-ink-fg/80'
            )}
          >
            {status}
          </span>
        </div>
        {scores && (
          <button
            type="button"
            className="inline-flex flex-shrink-0 items-center gap-2 rounded px-1.5 py-1 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label={t('dashboard:scoreInput.editScore')}
            onClick={onEditScore}
          >
            <span className="ring-1 ring-black/20 [--base-size:0.875rem]">
              <ScoresTeamName
                teamName={matchSettings.homeTeamNameAbbreviated}
                textColour={matchSettings.homeTeamTextColour}
                backgroundColour={matchSettings.homeTeamBackgroundColour}
              />
            </span>
            <span className="text-2xl font-bold tabular-nums leading-none">
              {scores.homeTeam} - {scores.awayTeam}
            </span>
            <span className="ring-1 ring-black/20 [--base-size:0.875rem]">
              <ScoresTeamName
                teamName={matchSettings.awayTeamNameAbbreviated}
                textColour={matchSettings.awayTeamTextColour}
                backgroundColour={matchSettings.awayTeamBackgroundColour}
              />
            </span>
          </button>
        )}
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
        <div className="[container-type:inline-size]">
          <p
            className={classNames(
              'whitespace-nowrap font-bold tabular-nums leading-none tracking-tight',
              time.time ? '' : 'text-ink-fg/40'
            )}
            style={{ fontSize: clockFontSize(clock, time.additionalTime) }}
          >
            {clock}
            {!!time.additionalTime && (
              <span
                className="ml-[0.15em] text-[0.32em] text-warn"
                aria-label={t('dashboard:timeControl.addedTimeAria', {
                  minutes: time.additionalTime,
                })}
              >
                +{time.additionalTime}
              </span>
            )}
          </p>
        </div>
        {time.remainingTime && (
          <div className="pb-1 text-right">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-fg/60">
              {t('dashboard:timeControl.remaining')}
            </p>
            <p className="font-bold tabular-nums leading-none text-ink-fg/90 [font-size:clamp(1.5rem,8cqw,3rem)]">
              {time.remainingTime}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
