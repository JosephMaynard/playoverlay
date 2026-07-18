import { useEffect, useState } from 'react';
import { Scores } from 'src/types';
import './EndScreenLayout.css';
import { calculatePenalties } from '../../../utils';
import { MatchSettings } from 'src/zodSchemas';

export interface Props {
  scores: Scores;
  settings: MatchSettings;
  active: boolean;
}

export default function EndScreenLayout({ scores, settings, active }: Props) {
  const { homeTeamPenaltiesScored, awayTeamPenaltiesScored } =
    calculatePenalties(scores.penalties);
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
        </div>
      </div>
      <div className="EndScreenLayout_score z-10 bg-white text-center font-bold tabular-nums text-black">
        <div>
          {scores.homeTeam} - {scores.awayTeam}
        </div>
        {scores.penalties.length > 0 && (
          <div className="EndScreenLayout_penalties">
            <div className="EndScreenLayout_penalties_title bg-black text-center text-white">
              Penalties
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
        </div>
      </div>
    </div>
  );
}
