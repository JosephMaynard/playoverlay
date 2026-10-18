import { LiveMatch } from './types';

// Whether a saved live-match snapshot shows a match underway, and so is
// offered for restore. Shared by the dashboard (which shows the offer) and
// the main process (which holds the outputs while the offer is pending), so
// the two can never disagree about which snapshots get an offer.
export function isRestorableLiveMatch(liveMatch: LiveMatch | undefined) {
  if (!liveMatch) return false;
  return (
    liveMatch.scores?.homeTeam > 0 ||
    liveMatch.scores?.awayTeam > 0 ||
    (liveMatch.scores?.penalties?.length ?? 0) > 0 ||
    liveMatch.time?.matchPhase !== undefined ||
    liveMatch.matchState?.previousMatchPhase !== undefined
  );
}
