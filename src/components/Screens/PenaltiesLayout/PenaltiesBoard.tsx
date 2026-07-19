import { Penalty, homeOrAway } from '../../../types';
import ScoresTeamName from '../../Screens/ScoresLayout/ScoresTeamName';
import { MatchSettings } from 'src/zodSchemas';
import PenaltyRow from './PenaltyRow';
import { calculatePenalties } from '../../../utils';

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
