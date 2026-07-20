import { useTranslation } from 'react-i18next';
import { MatchSettings } from 'src/zodSchemas';
import { Scores, Time } from '../../types';

export interface Props {
  matchSettings: MatchSettings;
  scores: Scores;
  time: Time;
  updateScore: (scoreUpdates: Partial<Scores>) => void;
}
import CollapsiblePanel from '../CollapsiblePanel/CollapsiblePanel';
import ScoreInput from './ScoreInput';

export default function ScoresPanel({
  matchSettings,
  scores,
  updateScore,
}: Props) {
  const { t } = useTranslation();
  return (
    <CollapsiblePanel title={t('dashboard:scoresPanel.title')}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ScoreInput
          title={t('settings:matchMenu.homeTeam')}
          score={scores.homeTeam}
          id="homeTeamScore"
          setScore={(homeTeam: number) => updateScore({ homeTeam })}
          textColour={matchSettings.homeTeamTextColour}
          backgroundColour={matchSettings.homeTeamBackgroundColour}
          teamNameFull={matchSettings.homeTeamNameFull}
          teamNameAbbreviated={matchSettings.homeTeamNameAbbreviated}
        />
        <ScoreInput
          title={t('settings:matchMenu.awayTeam')}
          score={scores.awayTeam}
          id="awayTeamScore"
          setScore={(awayTeam: number) => updateScore({ awayTeam })}
          textColour={matchSettings.awayTeamTextColour}
          backgroundColour={matchSettings.awayTeamBackgroundColour}
          teamNameFull={matchSettings.awayTeamNameFull}
          teamNameAbbreviated={matchSettings.awayTeamNameAbbreviated}
        />
      </div>
    </CollapsiblePanel>
  );
}
