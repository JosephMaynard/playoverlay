import { Time, Scores } from 'src/types';
import { MatchSettings } from 'src/zodSchemas';
import ScoresTeamName from './ScoresTeamName';
import './ScoresLayout.css';

export interface Props {
  scores: Scores;
  matchSettings: MatchSettings;
  time: Time;
  active: boolean;
}

export default function Scores({ scores, matchSettings, time, active }: Props) {
  const logoCount =
    (matchSettings.homeTeamLogo ? 1 : 0) + (matchSettings.awayTeamLogo ? 1 : 0);
  const activeClass = active
    ? `ScoresLayout_active ${
        logoCount > 0 ? `ScoresLayout_active_logos${logoCount}` : ''
      }`
    : '';

  return (
    <div className={`ScoresLayout flex ${activeClass}`}>
      {matchSettings.homeTeamLogo && (
        <div className="ScoresLayout_item ScoresLayout_logo">
          <img
            src={matchSettings.homeTeamLogo}
            alt=""
            className="h-full w-full object-contain"
          />
        </div>
      )}
      <ScoresTeamName
        textColour={matchSettings.homeTeamTextColour}
        backgroundColour={matchSettings.homeTeamBackgroundColour}
        teamName={matchSettings.homeTeamNameAbbreviated}
      />
      <div className="ScoresLayout_item ScoresLayout_scores bg-black text-center font-bold text-white">
        {' '}
        {scores.homeTeam} - {scores.awayTeam}{' '}
      </div>
      <ScoresTeamName
        textColour={matchSettings.awayTeamTextColour}
        backgroundColour={matchSettings.awayTeamBackgroundColour}
        teamName={matchSettings.awayTeamNameAbbreviated}
      />
      {matchSettings.awayTeamLogo && (
        <div className="ScoresLayout_item ScoresLayout_logo">
          <img
            src={matchSettings.awayTeamLogo}
            alt=""
            className="h-full w-full object-contain"
          />
        </div>
      )}
      {time.time && (
        <div className="ScoresLayout_item ScoresLayout_time bg-black text-center text-white">
          {time.time}
        </div>
      )}
      {time.additionalTime && (
        <div className="ScoresLayout_item bg-white text-center font-bold text-black">
          + {time.additionalTime}
        </div>
      )}
    </div>
  );
}
