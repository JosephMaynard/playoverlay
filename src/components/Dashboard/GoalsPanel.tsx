import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import ActionButton from '../ui/ActionButton';
import IconButton from '../ui/IconButton';
import { inputClassName } from '../ui/fields';
import { ScoresTeamName } from '@playoverlay/screens';
import {
  Goal,
  MatchSettings,
  MAX_SCORER_LENGTH,
  classNames,
  formatGoalMinute,
  formatScorer,
  homeOrAway,
  teamPlayers,
} from '@playoverlay/core';

// Records a goal's scorer. A player picked from the line-up passes their
// shirt number ('' for a player without one); typed text passes none.
type SetScorer = (
  goalId: string,
  scorer: string,
  scorerNumber?: string
) => void;

export interface Props {
  goals: Goal[];
  matchSettings: MatchSettings;
  // Tapping a team's goal key: the host adds the goal and decides whether
  // to ask who scored.
  onGoal: (team: homeOrAway) => void;
  // Opens the scorer picker for a goal by a team with a line-up.
  onPickScorer: (goal: Goal) => void;
  setScorer: SetScorer;
  removeGoal: (goalId: string) => void;
}

// min-w-0 lets the field shrink inside the row instead of pushing the
// remove button off a narrow screen.
const scorerInputClassName = classNames(inputClassName, 'min-w-0');

// The scorer field for a goal by a team without a line-up. Like the score
// editor, it commits on blur or Enter rather than per keystroke, so a
// half-typed name never reaches the banner or the undo stack.
function ScorerInput({
  goal,
  label,
  placeholder,
  setScorer,
}: {
  goal: Goal;
  label: string;
  placeholder: string;
  setScorer: SetScorer;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    setScorer(goal.id, draft);
    setDraft(null);
  };
  return (
    <input
      type="text"
      aria-label={label}
      placeholder={placeholder}
      maxLength={MAX_SCORER_LENGTH}
      className={scorerInputClassName}
      value={draft ?? goal.scorer ?? ''}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') commit();
      }}
    />
  );
}

// A team's goal key: the club name small above a large "Goal", so any club
// name fits and the key still reads from across the touchline. Club
// colours tell the two apart without reading.
function GoalKey({
  team,
  matchSettings,
  onGoal,
}: {
  team: homeOrAway;
  matchSettings: MatchSettings;
  onGoal: (team: homeOrAway) => void;
}) {
  const { t } = useTranslation();
  const isHome = team === 'home';
  const name = isHome
    ? matchSettings.homeTeamNameFull
    : matchSettings.awayTeamNameFull;
  const backgroundColour = isHome
    ? matchSettings.homeTeamBackgroundColour
    : matchSettings.awayTeamBackgroundColour;
  const textColour = isHome
    ? matchSettings.homeTeamTextColour
    : matchSettings.awayTeamTextColour;
  return (
    <button
      type="button"
      className="key flex min-h-20 min-w-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-lg px-3 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
      style={{
        // The key's own gradient is drawn from the club colour, which the
        // key classes cannot know about.
        backgroundImage: `linear-gradient(180deg, ${backgroundColour}, color-mix(in srgb, ${backgroundColour} 78%, black))`,
        borderColor: `color-mix(in srgb, ${backgroundColour} 70%, black)`,
        color: textColour,
      }}
      aria-label={t('dashboard:goals.keyAria', { team: name })}
      onClick={() => onGoal(team)}
    >
      <span className="max-w-full truncate text-xs font-semibold uppercase tracking-[0.08em] opacity-90">
        {name}
      </span>
      <span className="text-2xl leading-none">{t('dashboard:goals.key')}</span>
    </button>
  );
}

// The Goals tab: a goal key per team, then the log of goals scored with
// their minutes and scorers. A scorer is picked in the modal for a team
// with a line-up (tapping the row reopens it), or typed for a team without.
export default function GoalsPanel({
  goals,
  matchSettings,
  onGoal,
  onPickScorer,
  setScorer,
  removeGoal,
}: Props) {
  const { t } = useTranslation();
  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <GoalKey team="home" matchSettings={matchSettings} onGoal={onGoal} />
        <GoalKey team="away" matchSettings={matchSettings} onGoal={onGoal} />
      </div>
      <h3 className="mb-1 mt-4 text-xs font-semibold uppercase tracking-wide text-muted">
        {t('dashboard:goalLog.title')}
      </h3>
      {goals.length === 0 ? (
        <p className="py-2 text-sm text-muted">{t('dashboard:goalLog.empty')}</p>
      ) : (
        <ul role="list" className="divide-y divide-line">
          {[...goals].reverse().map((goal) => {
            const isHome = goal.team === 'home';
            const teamName = isHome
              ? matchSettings.homeTeamNameFull
              : matchSettings.awayTeamNameFull;
            const minute = formatGoalMinute(goal, matchSettings);
            const description = minute
              ? t('dashboard:goalLog.goalWithMinute', {
                  team: teamName,
                  minute,
                })
              : t('dashboard:goalLog.goal', { team: teamName });
            const scorerLabel = t('dashboard:goalLog.scorerLabel', {
              goal: description,
            });
            const hasLineup = teamPlayers(matchSettings, goal.team).length > 0;
            return (
              <li
                key={goal.id}
                className="flex min-h-14 items-center gap-x-3 py-1.5"
                aria-label={description}
              >
                <div className="flex-shrink-0 ring-1 ring-black/10 [--base-size:0.875rem]">
                  <ScoresTeamName
                    teamName={
                      isHome
                        ? matchSettings.homeTeamNameAbbreviated
                        : matchSettings.awayTeamNameAbbreviated
                    }
                    textColour={
                      isHome
                        ? matchSettings.homeTeamTextColour
                        : matchSettings.awayTeamTextColour
                    }
                    backgroundColour={
                      isHome
                        ? matchSettings.homeTeamBackgroundColour
                        : matchSettings.awayTeamBackgroundColour
                    }
                  />
                </div>
                <span className="w-12 flex-shrink-0 text-lg font-semibold tabular-nums text-fg">
                  {minute}
                </span>
                <div className="flex min-w-0 flex-grow items-center">
                  {hasLineup ? (
                    <ActionButton
                      variant="ghost"
                      className="min-w-0 max-w-full justify-start px-2 text-base font-medium"
                      aria-label={scorerLabel}
                      onClick={() => onPickScorer(goal)}
                      icon={
                        <PencilSquareIcon
                          className="h-5 w-5 flex-shrink-0 text-faint"
                          aria-hidden="true"
                        />
                      }
                    >
                      <span
                        className={classNames(
                          'truncate',
                          goal.scorer ? 'text-fg' : 'text-muted'
                        )}
                      >
                        {goal.scorer
                          ? formatScorer(goal)
                          : t('dashboard:goals.addScorer')}
                      </span>
                    </ActionButton>
                  ) : (
                    <ScorerInput
                      goal={goal}
                      label={scorerLabel}
                      placeholder={t('dashboard:goalLog.scorerPlaceholder')}
                      setScorer={setScorer}
                    />
                  )}
                </div>
                <IconButton
                  tone="danger"
                  className="flex-shrink-0"
                  label={t('dashboard:goalLog.removeAria', {
                    goal: description,
                  })}
                  title={t('dashboard:goalLog.remove')}
                  icon={<TrashIcon className="h-6 w-6" aria-hidden="true" />}
                  onClick={() => removeGoal(goal.id)}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
