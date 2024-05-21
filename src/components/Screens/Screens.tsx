import MatchTitleLayout from '../MatchTitleLayout/MatchTitleLayout';
import ScoresLayout from '../ScoresLayout/ScoresLayout';
import {
  MatchSettings,
  Scores,
  TeamSettingsInterface,
  Time,
} from '../../types';
import PenaltiesLayout from '../PenaltiesLayout/PenaltiesLayout';
import CustomScreenLayout from '../CustomScreenLayout/CustomScreenLayout';

export interface Props {
  teamSettings: TeamSettingsInterface;
  scores: Scores;
  time: Time;
  matchSettings: MatchSettings;
}

export default function Screens({
  teamSettings,
  scores,
  time,
  matchSettings,
}: Props) {
  return (
    <>
      <ScoresLayout
        settings={teamSettings}
        scores={scores}
        time={time}
        active={matchSettings.displayScreen === 'scoreBug'}
      />
      <MatchTitleLayout
        settings={teamSettings}
        scores={scores}
        time={time}
        active={matchSettings.displayScreen === 'matchTitle'}
      />
      <PenaltiesLayout
        penalties={scores.penalties}
        active={matchSettings.displayScreen === 'penalties'}
        penaltiesFirstTeam={matchSettings.penaltiesFirstTeam}
        teamSettings={teamSettings}
      />
      <CustomScreenLayout
        active={matchSettings.displayScreen === 'custom'}
        customScreenImageUrl={matchSettings.customScreenImageUrl}
      />
    </>
  );
}
