import { MatchSettings, AppSettings, Scores } from './types';
import { TeamSettingsInterface } from './zodSchemas';

export const defaultAppSettings: AppSettings = {
  keyColour: '#0000FF',
  autoSwitchScreens: true,
};

export const defaultTeamSettings: TeamSettingsInterface = {
  homeTeamNameFull: 'Home Team',
  homeTeamNameAbbreviated: 'HOM',
  homeTeamTextColour: '#ffffff',
  homeTeamBackgroundColour: '#cc0000',
  awayTeamNameFull: 'Away Team',
  awayTeamNameAbbreviated: 'AWA',
  awayTeamTextColour: '#ffffff',
  awayTeamBackgroundColour: '#0000cc',
};

export const demoModeTeamSettingsOverrides: Partial<TeamSettingsInterface> = {
  awayTeamNameFull: 'PlayOverlay Demo',
  awayTeamNameAbbreviated: 'DEMO',
  awayTeamTextColour: '#ffffff',
  awayTeamBackgroundColour: '#0000cc',
};

export const defaultMatchSettings: MatchSettings = {
  displayScreen: 'scoreBug',
  penaltiesFirstTeam: 'home',
  halfLength: 45,
  extraTimeHalfLength: 15,
};

export const defaultScores: Scores = {
  homeTeam: 0,
  awayTeam: 0,
  penalties: [],
};
