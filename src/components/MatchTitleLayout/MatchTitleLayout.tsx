import { Settings, Time, Scores } from 'src/types';
import './MatchTitleLayout.css';

export interface Props {
  scores: Scores;
  settings: Settings;
  time: Time;
  active: boolean;
}

export default function MatchTitleLayout({
  scores,
  settings,
  time,
  active,
}: Props) {
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
        {scores.homeTeam} - {scores.awayTeam}
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
