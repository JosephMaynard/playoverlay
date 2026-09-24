import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Switch } from '@headlessui/react';
import { MegaphoneIcon, TrashIcon } from '@heroicons/react/24/outline';
import CollapsiblePanel from '../CollapsiblePanel/CollapsiblePanel';
import ScoresTeamName from '../Screens/ScoresLayout/ScoresTeamName';
import { Goal } from '../../types';
import { MatchSettings } from '../../zodSchemas';
import { MAX_SCORER_LENGTH } from '../../constants';
import { formatGoalMinute } from '../../goalLog';
import { classNames } from '../../utils';

export interface Props {
  goals: Goal[];
  matchSettings: MatchSettings;
  showBannerAutomatically: boolean;
  setShowBannerAutomatically: (showBannerAutomatically: boolean) => void;
  setScorer: (goalId: string, scorer: string) => void;
  showBanner: (goalId: string) => void;
  removeGoal: (goalId: string) => void;
}

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
  setScorer: (goalId: string, scorer: string) => void;
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
      className="block w-full min-w-0 rounded-md border-0 px-2 py-1.5 text-sm text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
      value={draft ?? goal.scorer ?? ''}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') commit();
      }}
    />
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
                <div className="min-w-0 flex-grow">
                  <ScorerInput
                    goal={goal}
                    label={t('dashboard:goalLog.scorerLabel', {
                      goal: description,
                    })}
                    placeholder={t('dashboard:goalLog.scorerPlaceholder')}
                    setScorer={setScorer}
                  />
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
