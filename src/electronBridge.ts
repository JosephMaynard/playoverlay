import { mirrorStores, setMatchEventLogger } from '@playoverlay/core';

// Connects the control window's match stores to the Electron main process:
// every change to scores, time, match state, match settings and app
// settings goes over IPC (the main process fans it out to the display
// window, the OBS browser source and the phone remote, and persists it), and
// every recorded operator action goes to the main process's durable log.
// window.electronAPI is looked up on each call, as the stores themselves
// used to do, so nothing breaks when it is missing.
//
// Returns a function that disconnects both again.
export function connectStoresToElectron(): () => void {
  const stopMirroring = mirrorStores({
    onScores: (scores) => window?.electronAPI?.updateScores(scores),
    onTime: (time) => window?.electronAPI?.updateTime(time),
    onMatchState: (matchState) =>
      window?.electronAPI?.updateMatchState(matchState),
    onMatchSettings: (matchSettings) =>
      window?.electronAPI?.updateMatchSettings(matchSettings),
    onAppSettings: (appSettings) =>
      window?.electronAPI?.updateAppSettings(appSettings),
  });
  const stopLogging = setMatchEventLogger((label, source) =>
    window?.electronAPI?.logMatchEvent?.(label, source)
  );

  return () => {
    stopMirroring();
    stopLogging();
  };
}
