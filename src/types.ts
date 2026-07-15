import { DisplayScreen } from './constants';

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

export interface AppSettings {
  keyColour: string;
  autoSwitchScreens: boolean;
}

export interface MatchState {
  matchPhase?: MatchPhase;
  previousMatchPhase?: MatchPhase;
  displayScreen: DisplayScreen;
  penaltiesFirstTeam: homeOrAway;
  customScreenImageUrl?: string;
  overlays: CustomScreen[];
}

export interface Time {
  time?: string;
  remainingTime?: string;
  additionalTime?: number;
  paused?: boolean;
  showAdditionalTime?: boolean;
  matchPhase?: MatchPhase;
}

// Snapshot of the in-progress match, persisted so a crash or restart
// mid-match doesn't lose the score and clock
export interface LiveMatch {
  scores: Scores;
  time: Time;
  matchState: MatchState;
  savedAt: number;
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
  type?: 'screen' | 'overlay';
  overlayLinks?: DisplayScreen[];
}

export interface MatchPeriod {
  id: string;
  title: string;
  start: number;
  end: number;
}

// Phase ids are no longer a fixed football-only set: generic timer mode
// produces its own ids (period1, period2, ...), so this is just a string.
export type MatchPhase = string;

export type SideMenuType =
  | null
  | 'app-settings'
  | 'custom-screens'
  | 'team-settings'
  | 'system-settings';
