import { MatchPhase } from './constants';

export type homeOrAway = 'home' | 'away';

export interface Penalty {
  team: homeOrAway;
  result: 'scored' | 'missed';
}

export interface Scores {
  homeTeam: number;
  awayTeam: number;
  penalties: Penalty[];
}

export type DisplayScreen = 'none' | 'scoreBug' | 'matchTitle' | 'penalties';

export interface AppSettings {
  keyColour: string;
}

export interface TeamSettingsInterface {
  homeTeamNameFull: string;
  homeTeamNameAbbreviated: string;
  homeTeamTextColour?: string;
  homeTeamBackgroundColour?: string;
  awayTeamNameFull: string;
  awayTeamNameAbbreviated: string;
  awayTeamTextColour?: string;
  awayTeamBackgroundColour?: string;
}

export interface MatchSettings {
  matchPhase?: MatchPhase;
  displayScreen: DisplayScreen;
  penaltiesFirstTeam: homeOrAway;
}

export interface Time {
  time?: string;
  additionalTime?: number;
  paused?: boolean;
  showAdditionalTime?: boolean;
}

export interface Display {
  id: number;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}
