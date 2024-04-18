export interface Scores {
  homeTeam: number;
  awayTeam: number;
}

export interface Settings {
  keyColour: string;
  homeTeamName: string;
  homeTeamTextColour?: string;
  homeTeamBackgroundColour?: string;
  awayTeamName: string;
  awayTeamTextColour?: string;
  awayTeamBackgroundColour?: string;
}

export interface Time {
  time: string;
  additionalTime?: number;
}
