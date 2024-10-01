import { MatchState, AppSettings, Scores } from './types';
import { MatchSettings } from './zodSchemas';

export const defaultAppSettings: AppSettings = {
  keyColour: '#0000FF',
  autoSwitchScreens: true,
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
  halfLength: 45,
  extraTimeHalfLength: 15,
};

export const demoModeTeamSettingsOverrides: Partial<MatchSettings> = {
  awayTeamNameFull: 'PlayOverlay Demo',
  awayTeamNameAbbreviated: 'DEMO',
  awayTeamTextColour: '#ffffff',
  awayTeamBackgroundColour: '#0000cc',
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
} as const;

export type DisplayScreen = keyof typeof screens;
