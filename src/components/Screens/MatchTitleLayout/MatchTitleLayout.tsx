import { Scores } from 'src/types';
import './MatchTitleLayout.css';
import { calculatePenalties } from '../../../utils';
import { MatchSettings } from 'src/zodSchemas';

export interface Props {
  scores: Scores;
  settings: MatchSettings;
  active: boolean;
}

export default function MatchTitleLayout({ scores, settings, active }: Props) {
  const { homeTeamPenaltiesScored, awayTeamPenaltiesScored } =
    calculatePenalties(scores.penalties);
  return (
    <div
      className={`MatchTitleLayout ${active ? 'MatchTitleLayout_active' : 'MatchTitleLayout_hidden'} absolute left-0 top-0 h-full w-full`}
    >
      {settings?.venue && (
        <div className="MatchTitleLayout_venue flex justify-center">
          <div
            className={`MatchTitleLayout_venue_inner ${active ? 'MatchTitleLayout_venue_inner_active' : 'MatchTitleLayout_venue_inner_hidden'} z-0 max-w-full truncate bg-black text-center text-white`}
          >
            {settings.venue}
          </div>
        </div>
      )}
      <div className="MatchTitleLayout_homeTeam flex items-center overflow-hidden">
        <div
          className={`MatchTitleLayout_homeTeam_inner ${active ? 'MatchTitleLayout_homeTeam_inner_active' : 'MatchTitleLayout_homeTeam_inner_hidden'} w-full max-w-full truncate bg-black text-center text-white`}
        >
          <div>{settings.homeTeamNameFull}</div>
          <div
            className="MatchTitleLayout_teamColour"
            style={{ backgroundColor: settings.homeTeamBackgroundColour }}
          />
        </div>
      </div>
      <div className="MatchTitleLayout_score z-10 bg-white text-center font-bold tabular-nums text-black">
        <div>
          {scores.homeTeam} - {scores.awayTeam}
        </div>
        {scores.penalties.length > 0 && (
          <div className="MatchTitleLayout_penalties">
            <div className="MatchTitleLayout_penalties_title bg-black text-center text-white">
              Penalties
            </div>
            <div>{`( ${homeTeamPenaltiesScored} - ${awayTeamPenaltiesScored} )`}</div>
          </div>
        )}
      </div>
      <div className="MatchTitleLayout_awayTeam flex items-center overflow-hidden">
        <div
          className={`MatchTitleLayout_awayTeam_inner ${active ? 'MatchTitleLayout_awayTeam_inner_active' : 'MatchTitleLayout_awayTeam_inner_hidden'} w-full max-w-full truncate bg-black text-center text-white`}
        >
          <div>{settings.awayTeamNameFull}</div>
          <div
            className="MatchTitleLayout_teamColour"
            style={{ backgroundColor: settings.awayTeamBackgroundColour }}
          />
        </div>
      </div>
    </div>
  );
}
