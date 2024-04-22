import { Settings, Time, Scores } from 'src/types';
import './ScoresLayout.css';
import ScoresTeamName from './ScoresTeamName';

export interface Props {
  scores: Scores;
  settings: Settings;
  time: Time;
  active: boolean;
}

export default function Scores({ scores, settings, time, active }: Props) {
  return (
    <div className={`ScoresLayout flex${active ? ' ScoresLayout_active' : ''}`}>
      <ScoresTeamName
        textColour={settings.homeTeamTextColour}
        backgroundColour={settings.homeTeamBackgroundColour}
        teamName={settings.homeTeamNameAbbreviated}
      />
      <div className="ScoresLayout_item ScoresLayout_scores bg-black text-center font-bold text-white">
        {' '}
        {scores.homeTeam} - {scores.awayTeam}{' '}
      </div>
      <ScoresTeamName
        textColour={settings.awayTeamTextColour}
        backgroundColour={settings.awayTeamBackgroundColour}
        teamName={settings.awayTeamNameAbbreviated}
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
