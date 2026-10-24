import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import {
  Goal,
  MatchSettings,
  Player,
  Scores,
  classNames,
  formatGoalMinute,
  lineupAfterSubstitutions,
} from '@playoverlay/core';
import { ScoresTeamName } from '@playoverlay/screens';
import ActionButton from '../ui/ActionButton';
import IconButton from '../ui/IconButton';

export interface Props {
  // The goal whose scorer is being chosen; null closes the modal.
  goal: Goal | null;
  // True straight after the goal key was tapped: the score is already up
  // and the banner is waiting on this choice, so the modal also offers
  // "not a goal" for a mis-tap. False when changing the scorer of a goal
  // already in the log.
  isNew: boolean;
  matchSettings: MatchSettings;
  scores: Scores;
  onPick: (player: Player) => void;
  // Clears any scorer already on the goal, then closes.
  onNoScorer: () => void;
  // Closes and changes nothing (the close button, Escape, a click outside).
  onClose: () => void;
  onOwnGoal: () => void;
  onNotAGoal: () => void;
}

function PlayerTile({
  player,
  dim,
  onPick,
}: {
  player: Player;
  dim?: boolean;
  onPick: (player: Player) => void;
}) {
  return (
    <ActionButton
      size="lg"
      className={classNames('justify-start', dim ? 'opacity-60' : '')}
      onClick={() => onPick(player)}
    >
      <span className="w-8 flex-shrink-0 text-right text-xl tabular-nums text-muted">
        {player.number}
      </span>
      <span className="truncate">{player.name}</span>
    </ActionButton>
  );
}

// Who scored? Opens the moment a goal key is tapped for a team with a
// line-up. The score bug is already updated; the goal banner waits for the
// pick so it goes out once, with the name. Every way out is one tap: a
// player, no scorer, own goal, or not a goal at all. Escape and a tap
// outside count as no scorer, so a modal can never hold up the match.
export default function ScorerModal({
  goal,
  isNew,
  matchSettings,
  scores,
  onPick,
  onNoScorer,
  onClose,
  onOwnGoal,
  onNotAGoal,
}: Props) {
  const { t } = useTranslation();
  const open = goal !== null;
  const team = goal?.team ?? 'home';
  const isHome = team === 'home';
  // The ones on the pitch first (starters, with substitutions applied),
  // then the bench, greyed because a scorer from there means a
  // substitution was missed, not that it cannot happen.
  const { onPitch: pitch, bench } = goal
    ? lineupAfterSubstitutions(matchSettings, team, scores.substitutions ?? [])
    : { onPitch: [], bench: [] };
  const minute = goal ? formatGoalMinute(goal, matchSettings) : '';
  const teamName = isHome
    ? matchSettings.homeTeamNameFull
    : matchSettings.awayTeamNameFull;

  const tiles = (players: Player[], dim?: boolean) => (
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4">
      {players.map((player, index) => (
        <PlayerTile
          key={`${player.number ?? ''}-${player.name}-${index}`}
          player={player}
          dim={dim}
          onPick={onPick}
        />
      ))}
    </div>
  );

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 z-50 bg-overlay/60 transition-opacity" />
        </Transition.Child>
        <div className="fixed inset-0 z-50 w-screen overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="relative w-full max-w-3xl transform overflow-hidden rounded-md bg-surface p-5 text-left text-fg shadow-xl ring-1 ring-line transition-all">
                <div className="absolute right-2 top-2">
                  <IconButton
                    label={t('close')}
                    icon={<XMarkIcon className="h-6 w-6" aria-hidden="true" />}
                    onClick={onClose}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3 pr-12">
                  <span className="inline-flex items-center rounded-full bg-danger px-3 py-1 text-xs font-bold uppercase tracking-wide text-danger-fg">
                    {t('screens:goalBanner.goal')}
                  </span>
                  <Dialog.Title as="h3" className="text-xl font-bold">
                    {teamName}
                  </Dialog.Title>
                  {minute && (
                    <span className="text-xl font-semibold tabular-nums text-muted">
                      {minute}
                    </span>
                  )}
                  <span className="ml-auto inline-flex items-center gap-2 text-lg font-bold tabular-nums">
                    <span className="ring-1 ring-black/20 [--base-size:0.875rem]">
                      <ScoresTeamName
                        teamName={matchSettings.homeTeamNameAbbreviated}
                        textColour={matchSettings.homeTeamTextColour}
                        backgroundColour={
                          matchSettings.homeTeamBackgroundColour
                        }
                      />
                    </span>
                    {scores.homeTeam} - {scores.awayTeam}
                    <span className="ring-1 ring-black/20 [--base-size:0.875rem]">
                      <ScoresTeamName
                        teamName={matchSettings.awayTeamNameAbbreviated}
                        textColour={matchSettings.awayTeamTextColour}
                        backgroundColour={
                          matchSettings.awayTeamBackgroundColour
                        }
                      />
                    </span>
                  </span>
                </div>
                <p className="mt-3 flex flex-wrap items-baseline gap-x-3">
                  <span className="text-lg font-semibold">
                    {t('dashboard:scorer.whoScored')}
                  </span>
                  {isNew && (
                    <span className="text-sm text-muted">
                      {t('dashboard:scorer.hint')}
                    </span>
                  )}
                </p>
                {pitch.length > 0 && (
                  <>
                    <h4 className="mb-2 mt-3 text-xs font-semibold uppercase tracking-wide text-muted">
                      {t('dashboard:scorer.onPitch')}
                    </h4>
                    {tiles(pitch)}
                  </>
                )}
                {bench.length > 0 && (
                  <>
                    <h4 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-muted">
                      {t('dashboard:scorer.bench')}
                    </h4>
                    {tiles(bench, true)}
                  </>
                )}
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  {isNew && (
                    <ActionButton
                      variant="danger-ghost"
                      onClick={onNotAGoal}
                      icon={
                        <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                      }
                    >
                      {t('dashboard:scorer.notAGoal')}
                    </ActionButton>
                  )}
                  <span className="flex-1" />
                  <ActionButton className="min-w-40" onClick={onOwnGoal}>
                    {t('dashboard:scorer.ownGoal')}
                  </ActionButton>
                  <ActionButton className="min-w-40" onClick={onNoScorer}>
                    {t('dashboard:scorer.noScorer')}
                  </ActionButton>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
