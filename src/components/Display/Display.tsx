import { useState, useEffect, useCallback } from 'react';
import { AppSettings, MatchState, Scores, Time } from '../../types';
import { ArrowsPointingOutIcon } from '@heroicons/react/24/outline';
import {
  defaultAppSettings,
  defaultMatchState,
  defaultMatchSettings,
  defaultScores,
  DisplayScreen,
  screens,
} from '../../constants';
import Screens from '../Screens/Screens';
import { MatchSettings } from 'src/zodSchemas';
import { createDisplayTransport } from '../../displayTransport';

// Lets a browser-source URL pin a specific screen regardless of what the
// operator currently has selected, e.g. `?screen=scoreboard` for a venue TV
// while the OBS feed (no override) keeps following the operator. 'custom'
// is excluded: it depends on which custom screen the operator has picked,
// which has no meaningful "pinned" value.
function parseScreenOverride(search: string): DisplayScreen | null {
  const value = new URLSearchParams(search).get('screen');
  if (!value || value === 'custom') return null;
  // hasOwnProperty, not `in`: bare `in` matches inherited Object keys
  // ('toString', 'constructor', …), which would blank the feed instead of
  // falling back to the operator's selection.
  return Object.prototype.hasOwnProperty.call(screens, value)
    ? (value as DisplayScreen)
    : null;
}

const Display = () => {
  const [transport] = useState(() => createDisplayTransport());
  // Read once at mount: the pinned screen (if any) never changes for the
  // lifetime of this page load.
  const [screenOverride] = useState(() =>
    typeof window === 'undefined'
      ? null
      : parseScreenOverride(window.location.search)
  );
  const [scores, setScores] = useState<Scores>(defaultScores);
  const [time, setTime] = useState<Time>({});
  const [matchSettings, setMatchSettings] =
    useState<MatchSettings>(defaultMatchSettings);
  const [matchState, setMatchState] = useState<MatchState>(defaultMatchState);
  const [appSettings, setAppSettings] =
    useState<AppSettings>(defaultAppSettings);

  const [isFullscreen, setIsFullscreen] = useState(false);

  const checkFullscreenStatus = useCallback(async () => {
    const status = await transport.getFullscreenStatus();
    setIsFullscreen(status);
  }, [transport]);

  const handleToggleFullscreen = () => {
    transport.toggleFullscreen();
    checkFullscreenStatus(); // Update status after toggle
  };

  useEffect(() => {
    checkFullscreenStatus(); // Check status on component mount
    window.addEventListener('resize', checkFullscreenStatus);

    return () => {
      window.removeEventListener('resize', checkFullscreenStatus);
    };
  }, [checkFullscreenStatus]);

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

    const removeScoreListener = transport.onScoreUpdated(handleScoreUpdate);
    const removeTimeListener = transport.onTimeUpdated(handleTimeUpdate);
    const removeMatchSettingsListener = transport.onMatchSettingsUpdated(
      handleTeamSettingsUpdate
    );
    const removeAppSettingsListener = transport.onAppSettingsUpdated(
      handleAppSettingsUpdate
    );
    const removeMatchStateListener = transport.onMatchStateUpdated(
      handleMatchSettingsUpdate
    );

    // After listeners are set up, request initial state from main
    transport.displayReady();

    return () => {
      removeScoreListener();
      removeTimeListener();
      removeMatchSettingsListener();
      removeAppSettingsListener();
      removeMatchStateListener();
    };
  }, [transport]);

  // OBS browser sources are transparent by default when the page itself
  // paints no opaque background; make that explicit for browser-source mode
  // (the Electron display window still always uses the chroma-key colour).
  useEffect(() => {
    if (!transport.isBrowserSource) return;
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
  }, [transport.isBrowserSource]);

  return (
    <div
      className={`relative h-screen overflow-hidden ${isFullscreen ? 'cursor-none' : ''}`}
      style={{
        backgroundColor: transport.isBrowserSource
          ? 'transparent'
          : appSettings.keyColour,
      }}
    >
      <Screens
        matchSettings={matchSettings}
        scores={scores}
        time={time}
        matchState={
          transport.isBrowserSource && screenOverride
            ? { ...matchState, displayScreen: screenOverride }
            : matchState
        }
        clockFormat={appSettings.clockFormat}
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
