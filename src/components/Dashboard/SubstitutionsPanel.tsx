import { useTranslation } from 'react-i18next';
import { ArrowRightIcon, TrashIcon } from '@heroicons/react/24/outline';
import {
  MatchSettings,
  Substitution,
  formatPlayer,
  formatSubstitutionMinute,
  hasLineup,
  homeOrAway,
} from '@playoverlay/core';
import { ScoresTeamName } from '@playoverlay/screens';
import ActionButton from '../ui/ActionButton';
import IconButton from '../ui/IconButton';
import SubstitutionIcon from '../Icons/SubstitutionIcon';

export interface Props {
  substitutions: Substitution[];
  matchSettings: MatchSettings;
  // Opens the two-step substitution modal for a team.
  onSubstitute: (team: homeOrAway) => void;
  // Takes a logged substitution back; the pitch and bench follow.
  removeSubstitution: (substitutionId: string) => void;
}

// The Substitutions tab: a key per team that opens the off/on picker, then
// the log of changes made, latest first. A mistake is corrected by removing
// the entry, which puts the players back where they were.
export default function SubstitutionsPanel({
  substitutions,
  matchSettings,
  onSubstitute,
  removeSubstitution,
}: Props) {
  const { t } = useTranslation();
  const teamKey = (team: homeOrAway) => {
    const isHome = team === 'home';
    const name = isHome
      ? matchSettings.homeTeamNameFull
      : matchSettings.awayTeamNameFull;
    return (
      <ActionButton
        size="xl"
        className="min-h-20 flex-col gap-1"
        disabled={!hasLineup(matchSettings, team)}
        aria-label={t('dashboard:substitutions.keyAria', { team: name })}
        onClick={() => onSubstitute(team)}
      >
        <span className="max-w-full truncate text-xs font-semibold uppercase tracking-[0.08em] text-muted">
          {name}
        </span>
        <span className="inline-flex items-center gap-2 text-lg">
          <SubstitutionIcon className="h-5 w-5" aria-hidden="true" />
          {t('dashboard:substitutions.key')}
        </span>
      </ActionButton>
    );
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        {teamKey('home')}
        {teamKey('away')}
      </div>
      <h3 className="mb-1 mt-4 text-xs font-semibold uppercase tracking-wide text-muted">
        {t('dashboard:substitutions.title')}
      </h3>
      {substitutions.length === 0 ? (
        <p className="py-2 text-sm text-muted">
          {t('dashboard:substitutions.empty')}
        </p>
      ) : (
        <ul role="list" className="divide-y divide-line">
          {[...substitutions].reverse().map((substitution) => {
            const isHome = substitution.team === 'home';
            const teamName = isHome
              ? matchSettings.homeTeamNameFull
              : matchSettings.awayTeamNameFull;
            const minute = formatSubstitutionMinute(substitution, matchSettings);
            const description = t('dashboard:substitutions.entry', {
              team: teamName,
              off: formatPlayer(substitution.off),
              on: formatPlayer(substitution.on),
            });
            return (
              <li
                key={substitution.id}
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
                <span className="flex min-w-0 flex-grow items-center gap-2 text-base">
                  <span className="truncate font-medium text-danger">
                    {formatPlayer(substitution.off)}
                  </span>
                  <ArrowRightIcon
                    className="h-4 w-4 flex-shrink-0 text-faint"
                    aria-hidden="true"
                  />
                  <span className="truncate font-medium text-live-ink">
                    {formatPlayer(substitution.on)}
                  </span>
                </span>
                <IconButton
                  tone="danger"
                  className="flex-shrink-0"
                  label={t('dashboard:substitutions.removeAria', {
                    substitution: description,
                  })}
                  title={t('dashboard:substitutions.remove')}
                  icon={<TrashIcon className="h-6 w-6" aria-hidden="true" />}
                  onClick={() => removeSubstitution(substitution.id)}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
