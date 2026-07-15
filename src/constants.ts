import { MatchState, AppSettings, KeyboardShortcuts, Scores } from './types';
import { MatchSettings } from './zodSchemas';

export const defaultAppSettings: AppSettings = {
  keyColour: '#0000FF',
  autoSwitchScreens: true,
};

// The historical hardcoded shortcuts, unchanged so existing users notice
// nothing. `getKeyboardShortcuts` in utils.ts merges these with any
// bindings the user has customized.
export const defaultKeyboardShortcuts: KeyboardShortcuts = {
  nextMatchPhase: 'CommandOrControl+Shift+Space',
  homeTeamScored: 'CommandOrControl+Shift+H',
  awayTeamScored: 'CommandOrControl+Shift+A',
};

export const defaultMatchSettings: MatchSettings = {
  homeTeamNameFull: 'Home Team',
  homeTeamNameAbbreviated: 'HOM',
  homeTeamTextColour: '#ffffff',
  homeTeamBackgroundColour: '#cc0000',
  awayTeamNameFull: 'Away Team',
  awayTeamNameAbbreviated: 'AWA',
  awayTeamTextColour: '#ffffff',
  awayTeamBackgroundColour: '#0000cc',
  timerMode: 'football',
  halfLength: 45,
  extraTimeHalfLength: 15,
  hasExtraTime: true,
  hasPenalties: true,
};

export const defaultMatchState: MatchState = {
  displayScreen: 'scoreBug',
  penaltiesFirstTeam: 'home',
  overlays: [],
};

export const defaultScores: Scores = {
  homeTeam: 0,
  awayTeam: 0,
  penalties: [],
};

export const screens = {
  none: 'None',
  matchTitle: 'Match Title',
  scoreBug: 'Score Bug',
  penalties: 'Penalties',
  custom: 'Custom Screens',
  endScreen: 'End Screen',
} as const;

export type DisplayScreen = keyof typeof screens;
