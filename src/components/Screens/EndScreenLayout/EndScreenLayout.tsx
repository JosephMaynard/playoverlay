import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Scores } from 'src/types';
import './EndScreenLayout.css';
import { calculatePenalties } from '../../../utils';
import { MatchSettings } from 'src/zodSchemas';
import { ScorerLine, goalsByScorer } from '../../../goalLog';

export interface Props {
  scores: Scores;
  settings: MatchSettings;
  active: boolean;
}

// The full-time scorer list under a team's name: "Smith 23', 67'" per
// scorer, and a line of bare minutes for goals whose scorer wasn't entered.
function ScorerLines({ lines }: { lines: ScorerLine[] }) {
  if (lines.length === 0) return null;
  return (
    <div className="EndScreenLayout_goals">
      {lines.map((line, index) => (
        <div key={`${line.scorer ?? ''}-${index}`}>
          {[line.scorer, line.minutes.join(', ')].filter(Boolean).join(' ')}
        </div>
      ))}
    </div>
  );
}

export default function EndScreenLayout({ scores, settings, active }: Props) {
  const { t } = useTranslation();
  const { homeTeamPenaltiesScored, awayTeamPenaltiesScored } =
    calculatePenalties(scores.penalties);
  const goals = scores.goals ?? [];
  // The hidden animation starts from the fully-shown position, so it must
  // not play on first mount (display window load / OBS browser-source
  // reload would flash the layout on screen); only animate out after the
  // layout has actually been shown. Same pattern as ScoreboardLayout.
  const [hasBeenActive, setHasBeenActive] = useState(active);
  useEffect(() => {
    if (active) setHasBeenActive(true);
  }, [active]);
  return (
    <div
      className={`EndScreenLayout ${
        active
          ? 'EndScreenLayout_active'
          : hasBeenActive
            ? 'EndScreenLayout_hidden'
            : ''
      } absolute left-0 top-0 h-full w-full`}
    >
      <div className="EndScreenLayout_homeTeam flex items-center overflow-hidden">
        <div
          className={`EndScreenLayout_homeTeam_inner ${active ? 'EndScreenLayout_homeTeam_inner_active' : 'EndScreenLayout_homeTeam_inner_hidden'} w-full max-w-full truncate bg-black text-center text-white`}
        >
          <div>{settings.homeTeamNameFull}</div>
          <div
            className="EndScreenLayout_teamColour"
            style={{ backgroundColor: settings.homeTeamBackgroundColour }}
          />
          <ScorerLines lines={goalsByScorer(goals, 'home', settings)} />
        </div>
      </div>
      <div className="EndScreenLayout_score z-10 bg-white text-center font-bold tabular-nums text-black">
        <div>
          {scores.homeTeam} - {scores.awayTeam}
        </div>
        {scores.penalties.length > 0 && (
          <div className="EndScreenLayout_penalties">
            <div className="EndScreenLayout_penalties_title bg-black text-center text-white">
              {t('screens:penalties')}
            </div>
            <div>{`( ${homeTeamPenaltiesScored} - ${awayTeamPenaltiesScored} )`}</div>
          </div>
        )}
      </div>
      <div className="EndScreenLayout_awayTeam flex items-center overflow-hidden">
        <div
          className={`EndScreenLayout_awayTeam_inner ${active ? 'EndScreenLayout_awayTeam_inner_active' : 'EndScreenLayout_awayTeam_inner_hidden'} w-full max-w-full truncate bg-black text-center text-white`}
        >
          <div>{settings.awayTeamNameFull}</div>
          <div
            className="EndScreenLayout_teamColour"
            style={{ backgroundColor: settings.awayTeamBackgroundColour }}
          />
          <ScorerLines lines={goalsByScorer(goals, 'away', settings)} />
        </div>
      </div>
    </div>
  );
}
