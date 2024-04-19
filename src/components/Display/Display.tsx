import React, { useState, useEffect } from 'react';
import { Scores, Settings, Time } from '../../types';
import ScoresLayout from '../ScoresLayout/ScoresLayout';

const Display = () => {
  const [scores, setScores] = useState<Scores>({ homeTeam: 0, awayTeam: 0 });
  const [time, setTime] = useState<Time>({});
  const [settings, setSettings] = useState<Settings>({
    keyColour: '',
    homeTeamName: '',
    awayTeamName: '',
  });

  useEffect(() => {
    const handleScoreUpdate = (newScores: Scores) => {
      setScores(newScores);
      console.log(newScores);
    };
    const handleTimeUpdate = (newTime: Time) => {
      setTime(newTime);
      console.log(newTime);
    };
    const handleSettingsUpdate = (newSettings: Settings) => {
      setSettings(newSettings);
      console.log(newSettings);
    };

    window.electronAPI.onScoreUpdated(handleScoreUpdate);
    window.electronAPI.onTimeUpdated(handleTimeUpdate);
    window.electronAPI.onSettingsUpdated(handleSettingsUpdate);

    // Cleanup listeners on component unmount
    return () => {
      window.electronAPI.onScoreUpdated(() => {});
      window.electronAPI.onTimeUpdated(() => {});
      window.electronAPI.onSettingsUpdated(() => {});
    };
  }, []);

  return (
    <div
      className="h-screen overflow-hidden"
      style={{ backgroundColor: settings.keyColour }}
    >
      <ScoresLayout settings={settings} scores={scores} time={time} />
    </div>
  );
};

export default Display;
