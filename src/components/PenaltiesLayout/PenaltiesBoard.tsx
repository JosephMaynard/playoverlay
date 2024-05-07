import { Penalty, TeamSettingsInterface, homeOrAway } from '../../types';
import ScoresTeamName from '../ScoresLayout/ScoresTeamName';
import PenaltyRow from './PenaltyRow';

import './PenaltiesBoard.css';
import { calculatePenalties } from '../../utils';

export interface Props {
  penalties: Penalty[];
  penaltiesFirstTeam: homeOrAway;
  teamSettings: TeamSettingsInterface;
  className?: string;
}

export default function PenaltiesBoard({
  penalties,
  penaltiesFirstTeam,
  teamSettings,
  className,
}: Props) {
  const { homeTeamPenaltiesScored, awayTeamPenaltiesScored } =
    calculatePenalties(penalties);
  return (
    <div className={`PenaltiesBoard${className ? ` ${className}` : ''}`}>
      <ScoresTeamName
        textColour={
          penaltiesFirstTeam === 'home'
            ? teamSettings.homeTeamTextColour
            : teamSettings.awayTeamTextColour
        }
        backgroundColour={
          penaltiesFirstTeam === 'home'
            ? teamSettings.homeTeamBackgroundColour
            : teamSettings.awayTeamBackgroundColour
        }
        teamName={
          penaltiesFirstTeam === 'home'
            ? teamSettings.homeTeamNameAbbreviated
            : teamSettings.awayTeamNameAbbreviated
        }
      />
      <PenaltyRow
        penalties={penalties.filter((pen) => pen.team === penaltiesFirstTeam)}
        penaltiesTaken={penalties.length}
      />

      <div className="PenaltiesBoard_score bg-white text-center font-bold text-black [padding:calc(--base-size)]">
        {penaltiesFirstTeam === 'home'
          ? homeTeamPenaltiesScored
          : awayTeamPenaltiesScored}
      </div>
      <ScoresTeamName
        textColour={
          penaltiesFirstTeam === 'away'
            ? teamSettings.homeTeamTextColour
            : teamSettings.awayTeamTextColour
        }
        backgroundColour={
          penaltiesFirstTeam === 'away'
            ? teamSettings.homeTeamBackgroundColour
            : teamSettings.awayTeamBackgroundColour
        }
        teamName={
          penaltiesFirstTeam === 'away'
            ? teamSettings.homeTeamNameAbbreviated
            : teamSettings.awayTeamNameAbbreviated
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
