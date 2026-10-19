import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MatchState,
  MatchSettings,
  SUBSTITUTION_BANNER_DURATION_MS,
  Substitution,
  formatPlayer,
  formatSubstitutionMinute,
} from '@playoverlay/core';
import './SubstitutionBannerLayout.css';

export interface Props {
  substitutions: Substitution[];
  matchState: MatchState;
  matchSettings: MatchSettings;
}

// The on-air substitution banner: "SUB | Rovers | ▲ 14 Jones | ▼ 7 Rowe |
// 63'". Timed and placed exactly like the goal banner (see
// GoalBannerLayout): shown for SUBSTITUTION_BANNER_DURATION_MS from
// matchState.substitutionBanner.shownAt on this output's own clock, so a
// browser source that connects later doesn't replay it; off a blank output
// and a full-screen graphic; and off early if its entry disappears (an undo,
// or a removed entry). When both banners are up at once the host (Screens)
// hands the older one a matchState without its banner, so they never
// overlap.
export default function SubstitutionBannerLayout({
  substitutions,
  matchState,
  matchSettings,
}: Props) {
  const { t } = useTranslation();
  const { substitutionBanner, displayScreen } = matchState;
  const [withinWindow, setWithinWindow] = useState(false);
  // The entry last shown, kept while the banner animates out so its text
  // doesn't vanish mid-transition.
  const [shownSubstitution, setShownSubstitution] = useState<
    Substitution | undefined
  >();

  const substitutionId = substitutionBanner?.substitutionId;
  const shownAt = substitutionBanner?.shownAt;
  useEffect(() => {
    if (shownAt === undefined) {
      setWithinWindow(false);
      return;
    }
    const remaining = SUBSTITUTION_BANNER_DURATION_MS - (Date.now() - shownAt);
    if (remaining <= 0) {
      setWithinWindow(false);
      return;
    }
    setWithinWindow(true);
    const timer = setTimeout(() => setWithinWindow(false), remaining);
    return () => clearTimeout(timer);
  }, [substitutionId, shownAt]);

  const substitution = substitutions.find(
    (entry) => entry.id === substitutionId
  );
  useEffect(() => {
    if (substitution) setShownSubstitution(substitution);
  }, [substitution]);

  const active =
    withinWindow &&
    substitution !== undefined &&
    displayScreen !== 'none' &&
    displayScreen !== 'custom';
  const content = substitution ?? shownSubstitution;
  const isHome = content?.team === 'home';
  const minute = content ? formatSubstitutionMinute(content, matchSettings) : '';

  return (
    <div
      className={`SubstitutionBannerLayout flex ${
        active ? 'SubstitutionBannerLayout_active' : ''
      }`}
      aria-hidden={!active}
    >
      {content && (
        <>
          <div className="SubstitutionBannerLayout_item SubstitutionBannerLayout_label bg-white font-bold text-black">
            {t('screens:substitutionBanner.label')}
          </div>
          <div
            className="SubstitutionBannerLayout_item font-bold"
            style={{
              color: isHome
                ? matchSettings.homeTeamTextColour
                : matchSettings.awayTeamTextColour,
              backgroundColor: isHome
                ? matchSettings.homeTeamBackgroundColour
                : matchSettings.awayTeamBackgroundColour,
            }}
          >
            {isHome
              ? matchSettings.homeTeamNameFull
              : matchSettings.awayTeamNameFull}
          </div>
          <div className="SubstitutionBannerLayout_item SubstitutionBannerLayout_player bg-black text-white">
            <span
              className="SubstitutionBannerLayout_arrow text-green-500"
              aria-hidden="true"
            >
              ▲
            </span>
            <span>{formatPlayer(content.on)}</span>
          </div>
          <div className="SubstitutionBannerLayout_item SubstitutionBannerLayout_player bg-black text-white">
            <span
              className="SubstitutionBannerLayout_arrow text-red-500"
              aria-hidden="true"
            >
              ▼
            </span>
            <span>{formatPlayer(content.off)}</span>
          </div>
          {minute && (
            <div className="SubstitutionBannerLayout_item SubstitutionBannerLayout_minute bg-black font-bold text-white">
              {minute}
            </div>
          )}
        </>
      )}
    </div>
  );
}
