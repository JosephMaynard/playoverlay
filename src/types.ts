import { DisplayScreen } from './constants';
import { MatchSettings } from './zodSchemas';

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

export interface KeyboardShortcuts {
  nextMatchPhase: string;
  homeTeamScored: string;
  awayTeamScored: string;
}

// OBS Browser Source output: an optional local HTTP+WebSocket server that
// serves the display view for use as an OBS browser source. Off by default.
export interface BrowserSourceSettings {
  enabled: boolean;
  port: number;
}

export type ClockFormat = '24h' | '12h';

export interface AppSettings {
  keyColour: string;
  autoSwitchScreens: boolean;
  clockFormat?: ClockFormat;
  keyboardShortcuts?: KeyboardShortcuts;
  browserSource?: BrowserSourceSettings;
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
  // Team/timer settings as they were when the match was in progress. Older
  // snapshots predate this field, so it's optional and restore falls back
  // to whatever match settings are currently loaded.
  matchSettings?: MatchSettings;
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
