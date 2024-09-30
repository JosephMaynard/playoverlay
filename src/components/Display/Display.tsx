import { useState, useEffect } from 'react';
import { AppSettings, MatchState, Scores, Time } from '../../types';
import { ArrowsPointingOutIcon } from '@heroicons/react/24/outline';
import {
  defaultAppSettings,
  defaultMatchState,
  defaultMatchSettings,
  defaultScores,
} from '../../constants';
import Screens from '../Screens/Screens';
import { MatchSettings } from 'src/zodSchemas';

const Display = () => {
  const [scores, setScores] = useState<Scores>(defaultScores);
  const [time, setTime] = useState<Time>({});
  const [matchSettings, setMatchSettings] =
    useState<MatchSettings>(defaultMatchSettings);
  const [matchState, setMatchState] = useState<MatchState>(defaultMatchState);
  const [appSettings, setAppSettings] =
    useState<AppSettings>(defaultAppSettings);

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
    };
    const handleTimeUpdate = (newTime: Time) => {
      setTime(newTime);
    };
    const handleTeamSettingsUpdate = (newSettings: MatchSettings) => {
      setMatchSettings(newSettings);
    };
    const handleAppSettingsUpdate = (newSettings: AppSettings) => {
      setAppSettings(newSettings);
    };
    const handleMatchSettingsUpdate = (newSettings: MatchState) => {
      setMatchState(newSettings);
    };

    window.electronAPI.onScoreUpdated(handleScoreUpdate);
    window.electronAPI.onTimeUpdated(handleTimeUpdate);
    window.electronAPI.onMatchSettingsUpdated(handleTeamSettingsUpdate);
    window.electronAPI.onAppSettingsUpdated(handleAppSettingsUpdate);
    window.electronAPI.onMatchStateUpdated(handleMatchSettingsUpdate);

    // Cleanup listeners on component unmount
    return () => {
      window.electronAPI.onScoreUpdated(() => {});
      window.electronAPI.onTimeUpdated(() => {});
      window.electronAPI.onMatchStateUpdated(() => {});
      window.electronAPI.onAppSettingsUpdated(() => {});
      window.electronAPI.onMatchStateUpdated(() => {});
    };
  }, []);

  return (
    <div
      className={`h-screen overflow-hidden relative${isFullscreen ? 'cursor-none' : ''}`}
      style={{ backgroundColor: appSettings.keyColour }}
    >
      <Screens
        matchSettings={matchSettings}
        scores={scores}
        time={time}
        matchState={matchState}
      />
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
