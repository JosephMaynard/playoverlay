import { useState, useEffect } from 'react';
import { AppSettings, MatchState, Scores, Time } from '../../types';
import { ArrowsPointingOutIcon } from '@heroicons/react/24/outline';
import {
  defaultAppSettings,
  defaultMatchState,
  defaultTeamSettings,
  defaultScores,
} from '../../constants';
import Screens from '../Screens/Screens';
import { TeamSettingsInterface } from 'src/zodSchemas';

const Display = () => {
  const [scores, setScores] = useState<Scores>(defaultScores);
  const [time, setTime] = useState<Time>({});
  const [teamSettings, setTeamSettings] =
    useState<TeamSettingsInterface>(defaultTeamSettings);
  const [matchSettings, setMatchSettings] =
    useState<MatchState>(defaultMatchState);
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
    const handleTeamSettingsUpdate = (newSettings: TeamSettingsInterface) => {
      setTeamSettings(newSettings);
    };
    const handleAppSettingsUpdate = (newSettings: AppSettings) => {
      setAppSettings(newSettings);
    };
    const handleMatchSettingsUpdate = (newSettings: MatchState) => {
      setMatchSettings(newSettings);
    };

    window.electronAPI.onScoreUpdated(handleScoreUpdate);
    window.electronAPI.onTimeUpdated(handleTimeUpdate);
    window.electronAPI.onTeamSettingsUpdated(handleTeamSettingsUpdate);
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
        teamSettings={teamSettings}
        scores={scores}
        time={time}
        matchState={matchSettings}
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
