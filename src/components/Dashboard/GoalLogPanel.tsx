import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
  Switch,
} from '@headlessui/react';
import { MegaphoneIcon, TrashIcon } from '@heroicons/react/24/outline';
import CollapsiblePanel from '../CollapsiblePanel/CollapsiblePanel';
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

const scorerInputClassName =
  'block w-full min-w-0 rounded-md border-0 px-2 py-1.5 text-sm text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600';

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
            className="z-50 w-[var(--input-width)] min-w-56 rounded-md bg-white py-1 text-sm shadow-lg ring-1 ring-black/5 [--anchor-gap:4px]"
          >
            {matches.map((player, index) => (
              <ComboboxOption
                key={`${player.number ?? ''}-${player.name}-${index}`}
                value={player}
                className="flex cursor-default select-none items-center gap-x-3 px-3 py-1.5 text-gray-900 data-[focus]:bg-indigo-600 data-[focus]:text-white"
              >
                <span className="w-8 flex-shrink-0 text-right tabular-nums opacity-60">
                  {player.number}
                </span>
                <span className="truncate">{player.name}</span>
              </ComboboxOption>
            ))}
            <p className="px-3 py-1.5 text-xs text-gray-500">
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
      <Switch.Group as="div" className="mb-4 flex items-center">
        <Switch
          checked={showBannerAutomatically}
          onChange={setShowBannerAutomatically}
          className={classNames(
            showBannerAutomatically ? 'bg-indigo-600' : 'bg-gray-200',
            'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2'
          )}
        >
          <span
            aria-hidden="true"
            className={classNames(
              showBannerAutomatically ? 'translate-x-5' : 'translate-x-0',
              'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out'
            )}
          />
        </Switch>
        <Switch.Label as="span" className="ml-3 text-sm">
          <span className="font-medium text-gray-900">
            {t('dashboard:goalLog.showAutomatically')}
          </span>
        </Switch.Label>
      </Switch.Group>
      {goals.length === 0 ? (
        <p className="text-sm text-gray-500">{t('dashboard:goalLog.empty')}</p>
      ) : (
        <ul role="list" className="divide-y divide-gray-100">
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
                className="flex items-center gap-x-3 py-2"
                aria-label={description}
              >
                <div className="flex-shrink-0 ring-1 ring-gray-300 [--base-size:0.875rem]">
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
                <span className="w-14 flex-shrink-0 text-sm font-semibold tabular-nums text-gray-900">
                  {minute}
                </span>
                <div className="flex min-w-0 flex-grow items-center gap-x-2">
                  {goal.scorerNumber && (
                    <span className="flex-shrink-0 text-sm font-semibold tabular-nums text-gray-500">
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
                <button
                  type="button"
                  className="inline-flex flex-shrink-0 items-center gap-x-1.5 rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                  aria-label={t('dashboard:goalLog.showBannerAria', {
                    goal: description,
                  })}
                  onClick={() => showBanner(goal.id)}
                >
                  <MegaphoneIcon className="h-5 w-5" aria-hidden="true" />
                  <span className="hidden xl:inline">
                    {t('dashboard:goalLog.showBanner')}
                  </span>
                </button>
                <button
                  type="button"
                  className="flex-shrink-0 rounded-md p-1.5 text-gray-400 hover:text-red-600"
                  aria-label={t('dashboard:goalLog.removeAria', {
                    goal: description,
                  })}
                  title={t('dashboard:goalLog.remove')}
                  onClick={() => removeGoal(goal.id)}
                >
                  <TrashIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </CollapsiblePanel>
  );
}
