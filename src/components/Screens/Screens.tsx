import { MatchState, Scores, Time } from '../../types';
import { TeamSettingsInterface } from 'src/zodSchemas';
import ScoresLayout from './ScoresLayout/ScoresLayout';
import MatchTitleLayout from './MatchTitleLayout/MatchTitleLayout';
import PenaltiesLayout from './PenaltiesLayout/PenaltiesLayout';
import CustomScreenLayout from './CustomScreenLayout/CustomScreenLayout';
import { useEffect, useState } from 'react';
import BouncingLogo from './BouncingLogo/BouncingLogo';
import OverlaysLayout from './OverlaysLayout/OverlaysLayout';

export interface Props {
  teamSettings: TeamSettingsInterface;
  scores: Scores;
  time: Time;
  matchState: MatchState;
}

export default function Screens({
  teamSettings,
  scores,
  time,
  matchState,
}: Props) {
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    const checkDemoMode = async () => {
      const demoMode = await window.electronAPI.getDemoMode();
      setIsDemoMode(demoMode);
    };

    checkDemoMode();

    let interval: ReturnType<typeof setInterval> | null = null;

    if (isDemoMode === true) {
      interval = setInterval(() => {
        const logoElement = document.querySelector('#bouncing-logo');
        if (!logoElement) {
          // Re-render BouncingLogo component if it's not found
          setIsDemoMode(false);
          setTimeout(() => setIsDemoMode(true), 0);
        }
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isDemoMode]);

  return (
    <>
      {isDemoMode && <BouncingLogo />}
      <OverlaysLayout
        activeScreen={matchState.displayScreen}
        overlays={matchState.overlays}
      />
      <ScoresLayout
        settings={teamSettings}
        scores={scores}
        time={time}
        active={matchState.displayScreen === 'scoreBug'}
      />
      <MatchTitleLayout
        settings={teamSettings}
        scores={scores}
        active={matchState.displayScreen === 'matchTitle'}
      />
      <PenaltiesLayout
        penalties={scores.penalties}
        active={matchState.displayScreen === 'penalties'}
        penaltiesFirstTeam={matchState.penaltiesFirstTeam}
        teamSettings={teamSettings}
      />
      <CustomScreenLayout
        active={matchState.displayScreen === 'custom'}
        customScreenImageUrl={matchState.customScreenImageUrl}
      />
    </>
  );
}
