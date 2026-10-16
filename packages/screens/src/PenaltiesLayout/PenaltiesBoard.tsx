import {
  Penalty,
  homeOrAway,
  MatchSettings,
  calculatePenalties,
} from '@playoverlay/core';
import ScoresTeamName from '../ScoresLayout/ScoresTeamName';
import PenaltyRow from './PenaltyRow';

import './PenaltiesBoard.css';

export interface Props {
  penalties: Penalty[];
  penaltiesFirstTeam: homeOrAway;
  matchSettings: MatchSettings;
  className?: string;
}

export default function PenaltiesBoard({
  penalties,
  penaltiesFirstTeam,
  matchSettings,
  className,
}: Props) {
  const { homeTeamPenaltiesScored, awayTeamPenaltiesScored } =
    calculatePenalties(penalties);
  return (
    <div className={`PenaltiesBoard${className ? ` ${className}` : ''}`}>
      <ScoresTeamName
        textColour={
          penaltiesFirstTeam === 'home'
            ? matchSettings.homeTeamTextColour
            : matchSettings.awayTeamTextColour
        }
        backgroundColour={
          penaltiesFirstTeam === 'home'
            ? matchSettings.homeTeamBackgroundColour
            : matchSettings.awayTeamBackgroundColour
        }
        teamName={
          penaltiesFirstTeam === 'home'
            ? matchSettings.homeTeamNameAbbreviated
            : matchSettings.awayTeamNameAbbreviated
        }
      />
      <PenaltyRow
        penalties={penalties.filter((pen) => pen.team === penaltiesFirstTeam)}
        penaltiesTaken={penalties.length}
      />

      <div className="PenaltiesBoard_score bg-white text-center font-bold text-black">
        {penaltiesFirstTeam === 'home'
          ? homeTeamPenaltiesScored
          : awayTeamPenaltiesScored}
      </div>
      <ScoresTeamName
        textColour={
          penaltiesFirstTeam === 'away'
            ? matchSettings.homeTeamTextColour
            : matchSettings.awayTeamTextColour
        }
        backgroundColour={
          penaltiesFirstTeam === 'away'
            ? matchSettings.homeTeamBackgroundColour
            : matchSettings.awayTeamBackgroundColour
        }
        teamName={
          penaltiesFirstTeam === 'away'
            ? matchSettings.homeTeamNameAbbreviated
            : matchSettings.awayTeamNameAbbreviated
        }
      />
      <PenaltyRow
        penalties={penalties.filter((pen) => pen.team !== penaltiesFirstTeam)}
        penaltiesTaken={penalties.length}
      />
      <div className="PenaltiesBoard_score bg-white text-center font-bold text-black">
        {penaltiesFirstTeam === 'away'
          ? homeTeamPenaltiesScored
          : awayTeamPenaltiesScored}
      </div>
    </div>
  );
}
