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

export type DisplayScreen =
  | 'none'
  | 'scoreBug'
  | 'matchTitle'
  | 'penalties'
  | 'custom';

export interface AppSettings {
  keyColour: string;
  autoSwitchScreens: boolean;
}

export interface MatchSettings {
  matchPhase?: MatchPhase;
  previousMatchPhase?: MatchPhase;
  displayScreen: DisplayScreen;
  penaltiesFirstTeam: homeOrAway;
  customScreenImageUrl?: string;
  halfLength: number;
  extraTimeHalfLength: number;
}

export interface Time {
  time?: string;
  remainingTime?: string;
  additionalTime?: number;
  paused?: boolean;
  showAdditionalTime?: boolean;
  matchPhase?: MatchPhase;
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

export interface CustomScreen {
  title: string;
  filePath: string | null;
  url: string | null;
}

export interface SystemInfo {
  machine_description: string;
  machine_id: string;
  app_name: string;
  app_version: string;
}

export interface MatchPeriod {
  title: string;
  start: number;
  end: number;
}
export interface MatchPhases {
  firstHalf: MatchPeriod;
  secondHalf: MatchPeriod;
  extraTimeFirstHalf: MatchPeriod;
  extraTimeSecondHalf: MatchPeriod;
}

export type MatchPhase =
  | 'firstHalf'
  | 'secondHalf'
  | 'extraTimeFirstHalf'
  | 'extraTimeSecondHalf';
