export interface Scores {
  homeTeam: number;
  awayTeam: number;
}

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
}

export interface Time {
  time?: string;
  additionalTime?: number;
}
