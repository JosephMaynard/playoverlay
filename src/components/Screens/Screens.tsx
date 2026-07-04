import { MatchState, Scores, Time } from '../../types';
import { MatchSettings } from 'src/zodSchemas';
import ScoresLayout from './ScoresLayout/ScoresLayout';
import MatchTitleLayout from './MatchTitleLayout/MatchTitleLayout';
import EndScreenLayout from './EndScreenLayout/EndScreenLayout';
import PenaltiesLayout from './PenaltiesLayout/PenaltiesLayout';
import CustomScreenLayout from './CustomScreenLayout/CustomScreenLayout';
import OverlaysLayout from './OverlaysLayout/OverlaysLayout';

export interface Props {
  matchSettings: MatchSettings;
  scores: Scores;
  time: Time;
  matchState: MatchState;
}

export default function Screens({
  matchSettings,
  scores,
  time,
  matchState,
}: Props) {
  return (
    <>
      <OverlaysLayout
        activeScreen={matchState.displayScreen}
        overlays={matchState.overlays}
      />
      <ScoresLayout
        matchSettings={matchSettings}
        scores={scores}
        time={time}
        active={matchState.displayScreen === 'scoreBug'}
      />
      <MatchTitleLayout
        settings={matchSettings}
        scores={scores}
        active={matchState.displayScreen === 'matchTitle'}
      />
      <EndScreenLayout
        settings={matchSettings}
        scores={scores}
        active={matchState.displayScreen === 'endScreen'}
      />
      <PenaltiesLayout
        penalties={scores.penalties}
        active={matchState.displayScreen === 'penalties'}
        penaltiesFirstTeam={matchState.penaltiesFirstTeam}
        matchSettings={matchSettings}
      />
      <CustomScreenLayout
        active={matchState.displayScreen === 'custom'}
        customScreenImageUrl={matchState.customScreenImageUrl}
      />
    </>
  );
}
