import { MatchPhase } from './components/Dashboard/Dashboard';

export interface Scores {
  homeTeam: number;
  awayTeam: number;
}

export type DisplayScreen = 'none' | 'scoreBug' | 'matchTitle' | 'penalties';

export interface Settings {
  keyColour: string;
  homeTeamNameFull: string;
  homeTeamNameAbbreviated: string;
  homeTeamTextColour?: string;
  homeTeamBackgroundColour?: string;
  awayTeamNameFull: string;
  awayTeamNameAbbreviated: string;
  awayTeamTextColour?: string;
  awayTeamBackgroundColour?: string;
  matchPhase?: MatchPhase;
  displayScreen: DisplayScreen;
}

export interface Time {
  time?: string;
  additionalTime?: number;
}
