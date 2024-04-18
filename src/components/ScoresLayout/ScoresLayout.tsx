import { Settings, Time, Scores } from 'src/types';
import './ScoresLayout.css';

export interface Props {
  scores: Scores;
  settings: Settings;
  time: Time;
}

export default function Scores({ scores, settings, time }: Props) {
  return (
    <div className="ScoresLayout flex">
      <div
        className="ScoresLayout_item font-bold"
        style={{
          color: settings.homeTeamTextColour,
          backgroundColor: settings.homeTeamBackgroundColour,
        }}
      >
        {settings.homeTeamName}
      </div>
      <div className="ScoresLayout_item ScoresLayout_scores bg-black text-center font-bold text-white">
        {' '}
        {scores.homeTeam} - {scores.awayTeam}{' '}
      </div>
      <div
        className="ScoresLayout_item font-bold"
        style={{
          color: settings.awayTeamTextColour,
          backgroundColor: settings.awayTeamBackgroundColour,
        }}
      >
        {settings.awayTeamName}
      </div>
      <div className="ScoresLayout_item ScoresLayout_time bg-black text-center text-white">
        {time.time}
      </div>
    </div>
  );
}
