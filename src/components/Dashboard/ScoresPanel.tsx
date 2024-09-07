import { TeamSettingsInterface } from 'src/zodSchemas';
import { Scores, Time } from '../../types';

export interface Props {
  teamSettings: TeamSettingsInterface;
  scores: Scores;
  time: Time;
  updateScore: (scoreUpdates: Partial<Scores>) => void;
}
import CollapsiblePanel from '../CollapsiblePanel/CollapsiblePanel';
import ScoreInput from './ScoreInput';

export default function ScoresPanel({
  teamSettings,
  scores,
  updateScore,
}: Props) {
  return (
    <CollapsiblePanel title="Scores">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ScoreInput
          title="Home Team"
          score={scores.homeTeam}
          id="homeTeamScore"
          setScore={(homeTeam: number) => updateScore({ homeTeam })}
          textColour={teamSettings.homeTeamTextColour}
          backgroundColour={teamSettings.homeTeamBackgroundColour}
          teamNameFull={teamSettings.homeTeamNameFull}
          teamNameAbbreviated={teamSettings.homeTeamNameAbbreviated}
        />
        <ScoreInput
          title="Away Team"
          score={scores.awayTeam}
          id="awayTeamScore"
          setScore={(awayTeam: number) => updateScore({ awayTeam })}
          textColour={teamSettings.awayTeamTextColour}
          backgroundColour={teamSettings.awayTeamBackgroundColour}
          teamNameFull={teamSettings.awayTeamNameFull}
          teamNameAbbreviated={teamSettings.awayTeamNameAbbreviated}
        />
      </div>
    </CollapsiblePanel>
  );
}
