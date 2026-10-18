import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from '@headlessui/react';
import { MegaphoneIcon, TrashIcon } from '@heroicons/react/24/outline';
import CollapsiblePanel from '../CollapsiblePanel/CollapsiblePanel';
import ActionButton from '../ui/ActionButton';
import IconButton from '../ui/IconButton';
import Toggle from '../ui/Toggle';
import { inputClassName } from '../ui/fields';
import { ScoresTeamName } from '@playoverlay/screens';
import {
  Goal,
  MatchSettings,
  MAX_SCORER_LENGTH,
  Player,
  formatGoalMinute,
  classNames,
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
  showBannerAutomatically: boolean;
  setShowBannerAutomatically: (showBannerAutomatically: boolean) => void;
  setScorer: SetScorer;
  showBanner: (goalId: string) => void;
  removeGoal: (goalId: string) => void;
}

// min-w-0 lets the field shrink inside the row instead of pushing the
// banner and remove buttons off a narrow screen.
const scorerInputClassName = classNames(inputClassName, 'min-w-0');

// The scorer field for one goal. Like the score editor, it commits on blur or
// Enter rather than per keystroke, so a half-typed name never reaches the
// banner or the undo stack.
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

// The scorer field for a goal by a team with a line-up: the same field,
// offering the team's players as the operator types (matching name or shirt
// number). Picking one records the name and number together; anything else
// typed is committed on Enter or blur exactly as ScorerInput does, so a
// scorer outside the line-up (a late addition, an own goal) is never a
// problem.
function ScorerPicker({
  goal,
  players,
  label,
  placeholder,
  setScorer,
}: {
  goal: Goal;
  players: Player[];
  label: string;
  placeholder: string;
  setScorer: SetScorer;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  // The typed text, or null when nothing has been typed since the last
  // commit. Kept in a ref as well as rendered: a Tab can pick an option and
  // blur the field within one keystroke, and the blur must see the pick.
  const draftRef = useRef<string | null>(null);
  const optionsRef = useRef<HTMLDivElement | null>(null);

  const search = query.trim().toLocaleLowerCase();
  const matches = search
    ? players.filter(
        (player) =>
          player.name.toLocaleLowerCase().includes(search) ||
          player.number?.toLocaleLowerCase().startsWith(search)
      )
    : players;

  const commitTyped = () => {
    if (draftRef.current === null) return;
    const typed = draftRef.current;
    draftRef.current = null;
    setQuery('');
    setScorer(goal.id, typed);
  };

  const pick = (player: Player | null) => {
    // Headless UI reports null when the field is cleared; clearing is typed
    // text like any other and is committed on blur.
    if (!player) return;
    draftRef.current = null;
    setQuery('');
    setScorer(goal.id, player.name, player.number ?? '');
  };

  const selected =
    players.find(
      (player) =>
        player.name === goal.scorer && player.number === goal.scorerNumber
    ) ?? null;

  return (
    <Combobox
      value={selected}
      onChange={pick}
      by={(left, right) =>
        left?.name === right?.name && left?.number === right?.number
      }
      immediate
    >
      {({ open, activeOption }) => (
        <div className="relative">
          <ComboboxInput
            aria-label={label}
            placeholder={placeholder}
            maxLength={MAX_SCORER_LENGTH}
            className={scorerInputClassName}
            displayValue={() => goal.scorer ?? ''}
            onChange={(event) => {
              draftRef.current = event.target.value;
              setQuery(event.target.value);
            }}
            onKeyDown={(event) => {
              // With a player highlighted, Enter picks them (Headless UI
              // handles it); otherwise it commits what was typed.
              if (event.key === 'Enter' && !(open && activeOption)) {
                commitTyped();
              }
              // Escape closes the list and puts the field back to the
              // recorded scorer, so the typing is abandoned too.
              if (event.key === 'Escape') {
                draftRef.current = null;
                setQuery('');
              }
            }}
            onBlur={(event) => {
              if (optionsRef.current?.contains(event.relatedTarget as Node)) {
                return;
              }
              commitTyped();
            }}
          />
          <ComboboxOptions
            ref={optionsRef}
            anchor="bottom start"
            modal={false}
            className="z-50 w-[var(--input-width)] min-w-56 rounded-xl bg-surface py-1 text-base text-fg shadow-lg ring-1 ring-line [--anchor-gap:4px]"
          >
            {matches.map((player, index) => (
              <ComboboxOption
                key={`${player.number ?? ''}-${player.name}-${index}`}
                value={player}
                className="flex min-h-12 cursor-default select-none items-center gap-x-3 px-3 py-2 text-fg data-[focus]:bg-accent data-[focus]:text-accent-fg"
              >
                <span className="w-8 flex-shrink-0 text-right tabular-nums opacity-60">
                  {player.number}
                </span>
                <span className="truncate">{player.name}</span>
              </ComboboxOption>
            ))}
            <p className="px-3 py-2 text-sm text-muted">
              {t('dashboard:goalLog.pickScorer')}
            </p>
          </ComboboxOptions>
        </div>
      )}
    </Combobox>
  );
}

export default function GoalLogPanel({
  goals,
  matchSettings,
  showBannerAutomatically,
  setShowBannerAutomatically,
  setScorer,
  showBanner,
  removeGoal,
}: Props) {
  const { t } = useTranslation();
  return (
    // Collapsed by default: goals and their minutes are logged whatever the
    // panel's state, and a solo operator filming the match won't be typing
    // scorers until half-time or full-time.
    <CollapsiblePanel title={t('dashboard:goalLog.title')} defaultOpen={false}>
      <Toggle
        className="mb-4"
        checked={showBannerAutomatically}
        onChange={setShowBannerAutomatically}
        label={t('dashboard:goalLog.showAutomatically')}
      />
      {goals.length === 0 ? (
        <p className="text-sm text-muted">{t('dashboard:goalLog.empty')}</p>
      ) : (
        <ul role="list" className="divide-y divide-line">
          {goals.map((goal) => {
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
            const players = teamPlayers(matchSettings, goal.team);
            return (
              <li
                key={goal.id}
                className="flex min-h-14 items-center gap-x-3 py-2"
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
                <span className="w-14 flex-shrink-0 text-base font-semibold tabular-nums text-fg">
                  {minute}
                </span>
                <div className="flex min-w-0 flex-grow items-center gap-x-2">
                  {goal.scorerNumber && (
                    <span className="flex-shrink-0 text-base font-semibold tabular-nums text-muted">
                      {goal.scorerNumber}
                    </span>
                  )}
                  {players.length > 0 ? (
                    <ScorerPicker
                      goal={goal}
                      players={players}
                      label={scorerLabel}
                      placeholder={t('dashboard:goalLog.scorerPlaceholder')}
                      setScorer={setScorer}
                    />
                  ) : (
                    <ScorerInput
                      goal={goal}
                      label={scorerLabel}
                      placeholder={t('dashboard:goalLog.scorerPlaceholder')}
                      setScorer={setScorer}
                    />
                  )}
                </div>
                <ActionButton
                  size="md"
                  className="flex-shrink-0"
                  aria-label={t('dashboard:goalLog.showBannerAria', {
                    goal: description,
                  })}
                  onClick={() => showBanner(goal.id)}
                  icon={
                    <MegaphoneIcon className="h-6 w-6" aria-hidden="true" />
                  }
                >
                  {/* The right-hand column is only about 470px wide at the
                      lg breakpoint, so the label waits for xl; the
                      aria-label carries the name until then. */}
                  <span className="hidden xl:inline">
                    {t('dashboard:goalLog.showBanner')}
                  </span>
                </ActionButton>
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
    </CollapsiblePanel>
  );
}
