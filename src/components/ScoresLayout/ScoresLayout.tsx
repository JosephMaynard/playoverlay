import { Settings, Time, Scores } from 'src/types';
import './ScoresLayout.css';
import ScoresTeamName from './ScoresTeamName';

export interface Props {
  scores: Scores;
  settings: Settings;
  time: Time;
}

export default function Scores({ scores, settings, time }: Props) {
  return (
    <div className="ScoresLayout flex">
      <ScoresTeamName
        textColour={settings.homeTeamTextColour}
        backgroundColour={settings.homeTeamBackgroundColour}
        teamName={settings.homeTeamName}
      />
      <div className="ScoresLayout_item ScoresLayout_scores bg-black text-center font-bold text-white">
        {' '}
        {scores.homeTeam} - {scores.awayTeam}{' '}
      </div>
      <ScoresTeamName
        textColour={settings.awayTeamTextColour}
        backgroundColour={settings.awayTeamBackgroundColour}
        teamName={settings.awayTeamName}
      />
      {time.time && (
        <div className="ScoresLayout_item ScoresLayout_time bg-black text-center text-white">
          {time.time}
        </div>
      )}
    </div>
  );
}
