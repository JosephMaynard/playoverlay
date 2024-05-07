import { TeamSettingsInterface, Time, Scores } from 'src/types';
import './MatchTitleLayout.css';
import { calculatePenalties } from '../../utils';

export interface Props {
  scores: Scores;
  settings: TeamSettingsInterface;
  time: Time;
  active: boolean;
}

export default function MatchTitleLayout({
  scores,
  settings,
  time,
  active,
}: Props) {
  const { homeTeamPenaltiesScored, awayTeamPenaltiesScored } =
    calculatePenalties(scores.penalties);
  return (
    <div
      className={`MatchTitleLayout ${active ? 'MatchTitleLayout_active' : 'MatchTitleLayout_hidden'} absolute left-0 top-0 h-full w-full`}
    >
      <div className="MatchTitleLayout_homeTeam flex items-center overflow-hidden">
        <div
          className={`MatchTitleLayout_homeTeam_inner ${active ? 'MatchTitleLayout_homeTeam_inner_active' : 'MatchTitleLayout_homeTeam_inner_hidden'} w-full max-w-full truncate bg-black text-center text-white`}
        >
          {settings.homeTeamNameFull}
        </div>
      </div>
      <div className="MatchTitleLayout_score bg-white text-center font-bold tabular-nums text-black">
        <div>
          {scores.homeTeam} - {scores.awayTeam}
        </div>
        {scores.penalties.length > 0 && (
          <div className="MatchTitleLayout_penalties">{`(Pens ${homeTeamPenaltiesScored} - ${awayTeamPenaltiesScored})`}</div>
        )}
      </div>
      <div className="MatchTitleLayout_awayTeam flex items-center overflow-hidden">
        <div
          className={`MatchTitleLayout_awayTeam_inner ${active ? 'MatchTitleLayout_awayTeam_inner_active' : 'MatchTitleLayout_awayTeam_inner_hidden'} w-full max-w-full truncate bg-black  text-center text-white`}
        >
          {settings.awayTeamNameFull}
        </div>
      </div>
    </div>
  );
}
