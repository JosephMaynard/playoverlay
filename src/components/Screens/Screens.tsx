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
import { useEffect, useState } from 'react';
import BouncingLogo from '../BouncingLogo/BouncingLogo';

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
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    const checkDemoMode = async () => {
      const demoMode = await window.electronAPI.getDemoMode();
      setIsDemoMode(demoMode);
    };

    checkDemoMode();

    const interval = setInterval(() => {
      const logoElement = document.querySelector('#bouncing-logo');
      if (isDemoMode && !logoElement) {
        // Re-render BouncingLogo component if it's not found
        setIsDemoMode(false);
        setTimeout(() => setIsDemoMode(true), 0);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isDemoMode]);
  return (
    <>
      {isDemoMode && <BouncingLogo />}
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
