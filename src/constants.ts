import {
  MatchState,
  AppSettings,
  BrowserSourceSettings,
  KeyboardShortcuts,
  LanguageCode,
  Scores,
} from './types';
import { MatchSettings } from './zodSchemas';

// Off by default; a config.json saved before this feature existed has no
// `browserSource` key at all, and `getBrowserSourceSettings` in utils.ts
// merges these defaults in wherever settings are read, so that's identical
// to an explicit `enabled: false`.
export const defaultBrowserSourceSettings: BrowserSourceSettings = {
  enabled: false,
  port: 4750,
};

// `language` is deliberately omitted (left unset): that's what tells the
// control window to show the first-run language picker. An existing
// config.json saved before v0.18 has no `language` key either, so it
// behaves identically to a brand-new install, the picker fires once, and
// is pre-filled from the OS locale either way.
export const defaultAppSettings: AppSettings = {
  keyColour: '#0000FF',
  autoSwitchScreens: true,
  clockFormat: '24h',
  browserSource: { ...defaultBrowserSourceSettings },
};

// The eight shipped catalogues, in the order/grouping shown in the language
// picker and Window Settings selector. Labels are each language's own name
// for itself (and its variant), not English translations.
export const supportedLanguages: { code: LanguageCode; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
  { code: 'es-ES', label: 'Español (España)' },
  { code: 'es-419', label: 'Español (Latinoamérica)' },
  { code: 'pt-PT', label: 'Português (Portugal)' },
  { code: 'pt-BR', label: 'Português (Brasil)' },
];

// The historical hardcoded shortcuts, unchanged so existing users notice
// nothing. `getKeyboardShortcuts` in utils.ts merges these with any
// bindings the user has customized.
export const defaultKeyboardShortcuts: KeyboardShortcuts = {
  nextMatchPhase: 'CommandOrControl+Shift+Space',
  homeTeamScored: 'CommandOrControl+Shift+H',
  awayTeamScored: 'CommandOrControl+Shift+A',
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
  scoreboard: 'Scoreboard',
} as const;

export type DisplayScreen = keyof typeof screens;
