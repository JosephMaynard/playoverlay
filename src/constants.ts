import {
  MatchSettings,
  AppSettings,
  TeamSettingsInterface,
  Scores,
} from './types';

export const matchPhases = {
  firstHalf: {
    title: 'First Half',
    start: 0,
    end: 45,
  },
  secondHalf: {
    title: 'Second Half',
    start: 45,
    end: 90,
  },
  extraTimeFirstHalf: {
    title: 'Extra Time First Half',
    start: 90,
    end: 105,
  },
  extraTimeSecondHalf: {
    title: 'Extra Time Second Half',
    start: 105,
    end: 120,
  },
} as const;

export type MatchPhase = keyof typeof matchPhases;

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

export const defaultMatchSettings: MatchSettings = {
  displayScreen: 'scoreBug',
  penaltiesFirstTeam: 'home',
};

export const defaultScores: Scores = {
  homeTeam: 0,
  awayTeam: 0,
  penalties: [],
};
