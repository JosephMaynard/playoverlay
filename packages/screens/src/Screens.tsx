import {
  ClockFormat,
  MatchState,
  Scores,
  Time,
  MatchSettings,
} from '@playoverlay/core';
import ScoresLayout from './ScoresLayout/ScoresLayout';
import MatchTitleLayout from './MatchTitleLayout/MatchTitleLayout';
import EndScreenLayout from './EndScreenLayout/EndScreenLayout';
import PenaltiesLayout from './PenaltiesLayout/PenaltiesLayout';
import CustomScreenLayout from './CustomScreenLayout/CustomScreenLayout';
import OverlaysLayout from './OverlaysLayout/OverlaysLayout';
import ScoreboardLayout from './ScoreboardLayout/ScoreboardLayout';
import GoalBannerLayout from './GoalBannerLayout/GoalBannerLayout';
import SubstitutionBannerLayout from './SubstitutionBannerLayout/SubstitutionBannerLayout';
import LineupLayout from './LineupLayout/LineupLayout';

export interface Props {
  matchSettings: MatchSettings;
  scores: Scores;
  time: Time;
  matchState: MatchState;
  clockFormat?: ClockFormat;
}

// The goal and substitution banners share one spot, so only the one put up
// most recently is shown: the other layout gets a matchState without its
// banner, which it treats as "nothing to show" (and animates out if it was
// up). A goal re-shown from the log after a substitution wins again, since
// showing it gives it a fresh shownAt.
function splitBanners(matchState: MatchState): {
  forGoal: MatchState;
  forSubstitution: MatchState;
} {
  const { goalBanner, substitutionBanner } = matchState;
  if (!goalBanner || !substitutionBanner) {
    return { forGoal: matchState, forSubstitution: matchState };
  }
  return substitutionBanner.shownAt > goalBanner.shownAt
    ? {
        forGoal: { ...matchState, goalBanner: undefined },
        forSubstitution: matchState,
      }
    : {
        forGoal: matchState,
        forSubstitution: { ...matchState, substitutionBanner: undefined },
      };
}

export default function Screens({
  matchSettings,
  scores,
  time,
  matchState,
  clockFormat,
}: Props) {
  const substitutions = scores.substitutions ?? [];
  const banners = splitBanners(matchState);
  return (
    <>
      <OverlaysLayout
        activeScreen={matchState.displayScreen}
        overlays={matchState.overlays}
      />
      <ScoresLayout
        matchSettings={matchSettings}
        scores={scores}
        time={time}
        active={matchState.displayScreen === 'scoreBug'}
      />
      <MatchTitleLayout
        settings={matchSettings}
        scores={scores}
        active={matchState.displayScreen === 'matchTitle'}
      />
      <EndScreenLayout
        settings={matchSettings}
        scores={scores}
        active={matchState.displayScreen === 'endScreen'}
      />
      <PenaltiesLayout
        penalties={scores.penalties}
        active={matchState.displayScreen === 'penalties'}
        penaltiesFirstTeam={matchState.penaltiesFirstTeam}
        matchSettings={matchSettings}
      />
      <CustomScreenLayout
        active={matchState.displayScreen === 'custom'}
        customScreenImageUrl={matchState.customScreenImageUrl}
      />
      <ScoreboardLayout
        matchSettings={matchSettings}
        scores={scores}
        time={time}
        active={matchState.displayScreen === 'scoreboard'}
        clockFormat={clockFormat}
      />
      <LineupLayout
        team="home"
        matchSettings={matchSettings}
        substitutions={substitutions}
        active={matchState.displayScreen === 'homeLineup'}
      />
      <LineupLayout
        team="away"
        matchSettings={matchSettings}
        substitutions={substitutions}
        active={matchState.displayScreen === 'awayLineup'}
      />
      <GoalBannerLayout
        goals={scores.goals ?? []}
        matchState={banners.forGoal}
        matchSettings={matchSettings}
      />
      <SubstitutionBannerLayout
        substitutions={substitutions}
        matchState={banners.forSubstitution}
        matchSettings={matchSettings}
      />
    </>
  );
}
