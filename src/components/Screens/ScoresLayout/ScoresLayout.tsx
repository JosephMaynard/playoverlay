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
  return (
    <div className={`ScoresLayout flex ${active ? 'ScoresLayout_active' : ''}`}>
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
