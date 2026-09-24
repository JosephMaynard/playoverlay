import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Goal, MatchState } from 'src/types';
import { MatchSettings } from 'src/zodSchemas';
import { GOAL_BANNER_DURATION_MS } from '../../../constants';
import { formatGoalMinute } from '../../../goalLog';
import './GoalBannerLayout.css';

export interface Props {
  goals: Goal[];
  matchState: MatchState;
  matchSettings: MatchSettings;
}

// The on-air goal banner: "GOAL | Rovers | Smith | 23'". Shown for
// GOAL_BANNER_DURATION_MS from matchState.goalBanner.shownAt, measured on
// this output's own clock, so a browser source that connects (or an app
// that restarts) after that has passed doesn't replay an old banner. It sits
// over every screen except a blank output and a full-screen graphic, and
// comes off early if its goal disappears (an undo, or a removed entry).
export default function GoalBannerLayout({
  goals,
  matchState,
  matchSettings,
}: Props) {
  const { t } = useTranslation();
  const { goalBanner, displayScreen } = matchState;
  const [withinWindow, setWithinWindow] = useState(false);
  // The goal last shown, kept while the banner animates out so its text
  // doesn't vanish mid-transition.
  const [shownGoal, setShownGoal] = useState<Goal | undefined>();

  const goalId = goalBanner?.goalId;
  const shownAt = goalBanner?.shownAt;
  useEffect(() => {
    if (shownAt === undefined) {
      setWithinWindow(false);
      return;
    }
    const remaining = GOAL_BANNER_DURATION_MS - (Date.now() - shownAt);
    if (remaining <= 0) {
      setWithinWindow(false);
      return;
    }
    setWithinWindow(true);
    const timer = setTimeout(() => setWithinWindow(false), remaining);
    return () => clearTimeout(timer);
  }, [goalId, shownAt]);

  const goal = goals.find((entry) => entry.id === goalId);
  useEffect(() => {
    if (goal) setShownGoal(goal);
  }, [goal]);

  const active =
    withinWindow &&
    goal !== undefined &&
    displayScreen !== 'none' &&
    displayScreen !== 'custom';
  const content = goal ?? shownGoal;
  const isHome = content?.team === 'home';
  const minute = content ? formatGoalMinute(content, matchSettings) : '';

  return (
    <div
      className={`GoalBannerLayout flex ${active ? 'GoalBannerLayout_active' : ''}`}
      aria-hidden={!active}
    >
      {content && (
        <>
          <div className="GoalBannerLayout_item GoalBannerLayout_label bg-white font-bold text-black">
            {t('screens:goalBanner.goal')}
          </div>
          <div
            className="GoalBannerLayout_item font-bold"
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
          {content.scorer && (
            <div className="GoalBannerLayout_item bg-black text-white">
              {content.scorer}
            </div>
          )}
          {minute && (
            <div className="GoalBannerLayout_item GoalBannerLayout_minute bg-black font-bold text-white">
              {minute}
            </div>
          )}
        </>
      )}
    </div>
  );
}
