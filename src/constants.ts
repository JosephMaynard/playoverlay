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
