import { useState, useEffect } from 'react';
import { Scores, Settings, Time } from '../../types';
import ScoresLayout from '../ScoresLayout/ScoresLayout';
import { ArrowsPointingOutIcon } from '@heroicons/react/24/outline';

const Display = () => {
  const [scores, setScores] = useState<Scores>({ homeTeam: 0, awayTeam: 0 });
  const [time, setTime] = useState<Time>({});
  const [settings, setSettings] = useState<Settings>({
    keyColour: '',
    homeTeamName: '',
    awayTeamName: '',
  });

  const [isFullscreen, setIsFullscreen] = useState(false);

  const checkFullscreenStatus = async () => {
    const status = await window.electronAPI.getFullscreenStatus();
    setIsFullscreen(status);
  };

  const handleToggleFullscreen = () => {
    window.electronAPI.toggleFullscreen();
    checkFullscreenStatus(); // Update status after toggle
  };

  useEffect(() => {
    checkFullscreenStatus(); // Check status on component mount
    window.addEventListener('resize', checkFullscreenStatus);

    return () => {
      window.removeEventListener('resize', checkFullscreenStatus);
    };
  }, []);

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
      className={`h-screen overflow-hidden${isFullscreen ? ' cursor-none' : ''}`}
      style={{ backgroundColor: settings.keyColour }}
    >
      <ScoresLayout settings={settings} scores={scores} time={time} />
      {!isFullscreen && (
        <button
          type="button"
          className="absolute bottom-8 right-8 z-50 rounded-full bg-indigo-600 p-2 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          onClick={() => handleToggleFullscreen()}
        >
          <ArrowsPointingOutIcon className="h-5 w-5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

export default Display;
