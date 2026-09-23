import {
  AppSettings,
  BrowserSourceSettings,
  ClockFormat,
  KeyboardShortcuts,
  LanguageCode,
  MatchPeriod,
  MatchPhase,
  Penalty,
  RemoteControlSettings,
} from './types';
import { MatchSettings } from './zodSchemas';
import {
  defaultBrowserSourceSettings,
  defaultKeyboardShortcuts,
  defaultRemoteControlSettings,
} from './constants';

export const timeToString = (timeInSeconds: number) => {
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

// Additional time is whole minutes, at least one. Shared by the operator's
// input, the Dashboard handler (which also serves Stream Deck and restore
// paths) and the persisted-state schema, so a value that would render on air
// as "+ -2" or "+2.5" is rejected everywhere.
export function isValidAdditionalTime(minutes: unknown): minutes is number {
  return (
    typeof minutes === 'number' && Number.isInteger(minutes) && minutes > 0
  );
}

// Parses a "MM:SS" clock string (the inverse of timeToString) into whole
// seconds. Shared by the clock hook's restore paths and undo's running-clock
// compensation; callers keep their own handling of a missing time value.
export function parseTimeToSeconds(time: string): number {
  const [minutes, secs] = time.split(':').map(Number);
  return (minutes || 0) * 60 + (secs || 0);
}

function hexToRGB(hex: string): [number, number, number] {
  // Convert hex to RGB
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
}

function colorDistance(
  rgb1: [number, number, number],
  rgb2: [number, number, number]
): number {
  // Calculate the Euclidean distance between two RGB colors
  const [r1, g1, b1] = rgb1;
  const [r2, g2, b2] = rgb2;
  return Math.sqrt(
    Math.pow(r2 - r1, 2) + Math.pow(g2 - g1, 2) + Math.pow(b2 - b1, 2)
  );
}

export function checkColors(
  color1: string,
  color2: string,
  tolerance = 0.05
): boolean {
  // Convert hex colors to RGB
  const rgb1 = hexToRGB(color1);
  const rgb2 = hexToRGB(color2);

  // Calculate the distance between the two colors
  const distance = colorDistance(rgb1, rgb2);

  // Return true if the distance is less than the tolerance (colors are too close)
  return distance < tolerance;
}

// Example usage
// console.log(checkColors('#FF0000', '#FF0100')); // => false

export function calculatePenalties(penalties: Penalty[]) {
  const homeTeamPenaltiesScored = penalties.filter(
    (penalty) => penalty.team === 'home' && penalty.result === 'scored'
  ).length;
  const awayTeamPenaltiesScored = penalties.filter(
    (penalty) => penalty.team === 'away' && penalty.result === 'scored'
  ).length;
  return {
    homeTeamPenaltiesScored,
    awayTeamPenaltiesScored,
  };
}

export function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

// The ordered list of timer phases/periods for the current match settings.
// Football mode reproduces the historical firstHalf/secondHalf/extraTime*
// phases exactly (dropping the extra-time phases when hasExtraTime is
// explicitly false); generic mode builds N evenly-sized periods named from
// periodName. Titles are returned as an i18next key (+ params) rather than a
// baked English string, see getPhaseTitle below for rendering it.
export function getPhaseList(matchSettings: MatchSettings): MatchPeriod[] {
  if (matchSettings.timerMode === 'generic') {
    // Defence in depth: schema validation clamps periodCount on every write
    // path, but getPhaseList runs during render, so a bad value reaching it
    // (e.g. an unvalidated restore) must never blow up Array.from.
    const rawPeriodCount = matchSettings.periodCount ?? 4;
    const periodCount =
      Number.isInteger(rawPeriodCount) && rawPeriodCount > 0
        ? Math.min(rawPeriodCount, 100)
        : 4;
    const periodLength = matchSettings.periodLength ?? 10;
    // A custom periodName is user-entered text (e.g. "Quarter", "Innings"),
    // never translated; only the "Period" fallback used when it's unset is a
    // fixed English UI string, so it gets its own translation key.
    const customPeriodName = matchSettings.periodName?.trim();

    return Array.from({ length: periodCount }, (_, index) => {
      const number = index + 1;
      return {
        id: `period${number}`,
        titleKey: customPeriodName
          ? 'screens:phase.customPeriod'
          : 'screens:phase.period',
        titleParams: customPeriodName
          ? { name: customPeriodName, n: number }
          : { n: number },
        start: index * periodLength,
        end: number * periodLength,
      };
    });
  }

  const halfLength = matchSettings.halfLength ?? 45;
  const extraTimeHalfLength = matchSettings.extraTimeHalfLength ?? 15;

  const phases: MatchPeriod[] = [
    {
      id: 'firstHalf',
      titleKey: 'screens:phase.firstHalf',
      start: 0,
      end: halfLength,
    },
    {
      id: 'secondHalf',
      titleKey: 'screens:phase.secondHalf',
      start: halfLength,
      end: halfLength * 2,
    },
  ];

  if (matchSettings.hasExtraTime !== false) {
    phases.push(
      {
        id: 'extraTimeFirstHalf',
        titleKey: 'screens:phase.extraTimeFirstHalf',
        start: halfLength * 2,
        end: halfLength * 2 + extraTimeHalfLength,
      },
      {
        id: 'extraTimeSecondHalf',
        titleKey: 'screens:phase.extraTimeSecondHalf',
        start: halfLength * 2 + extraTimeHalfLength,
        end: (halfLength + extraTimeHalfLength) * 2,
      }
    );
  }

  return phases;
}

// Renders a MatchPeriod's title via the caller's i18next `t` function. Pure
// aside from the translation lookup: every call site that displays a phase's
// name (TimeControlPanel, SystemSettingsMenu's Stream Deck buttons,
// TimeDisplay) goes through this so it's always derived the same way.
// Dashboard.tsx only ever reads a phase's id/start/end, never its title, so
// it has no call site here.
export function getPhaseTitle(
  t: (key: string, options?: Record<string, unknown>) => string,
  phase: MatchPeriod
): string {
  return t(phase.titleKey, phase.titleParams);
}

export function getPhaseById(
  matchSettings: MatchSettings,
  id?: MatchPhase
): MatchPeriod | undefined {
  if (id === undefined) return undefined;
  return getPhaseList(matchSettings).find((phase) => phase.id === id);
}

// Pure walk over the phase list: mirrors the Dashboard's historical
// "next match phase" semantics, pressing next while a phase is running
// stops the clock instead of advancing it; otherwise it starts the first
// phase, or the one after previousPhaseId (undefined once the list ends).
export function getNextPhaseId(
  phaseList: MatchPeriod[],
  currentPhaseId: MatchPhase | undefined,
  previousPhaseId: MatchPhase | undefined
): MatchPhase | undefined {
  if (currentPhaseId !== undefined) return undefined;
  if (previousPhaseId === undefined) return phaseList[0]?.id;

  const previousIndex = phaseList.findIndex(
    (phase) => phase.id === previousPhaseId
  );
  if (previousIndex === -1) return undefined;

  return phaseList[previousIndex + 1]?.id;
}

// Time-of-day formatting for the spectator scoreboard clock.
export function formatTimeOfDay(
  date: Date,
  format: ClockFormat = '24h'
): string {
  const minutes = date.getMinutes().toString().padStart(2, '0');
  if (format === '12h') {
    const suffix = date.getHours() >= 12 ? 'pm' : 'am';
    const hours = date.getHours() % 12 || 12;
    return `${hours}:${minutes}${suffix}`;
  }
  return `${date.getHours().toString().padStart(2, '0')}:${minutes}`;
}

export function arraysEqual(arr1?: string[], arr2?: string[]): boolean {
  if (arr1 === undefined || arr2 === undefined || arr1.length !== arr2.length)
    return false;

  const sortedArr1 = [...arr1].sort();
  const sortedArr2 = [...arr2].sort();

  return sortedArr1.every((value, index) => value === sortedArr2[index]);
}

export function insertValue(arr: string[], value: string): string[] {
  if (!arr.includes(value)) {
    return [...arr, value];
  }
  return arr;
}

export function removeValue(arr: string[], value: string): string[] {
  return arr.filter((item) => item !== value);
}

// The active keyboard shortcut bindings: user customizations layered over
// the historical defaults, so a config.json with no `keyboardShortcuts`
// field (or one missing an individual action) behaves exactly as before.
// Shared by main.ts (registration) and the renderer (settings UI).
export function getKeyboardShortcuts(
  appSettings: AppSettings
): KeyboardShortcuts {
  return {
    ...defaultKeyboardShortcuts,
    ...appSettings.keyboardShortcuts,
  };
}

// The always-on global variant of a focus-only accelerator: Alt is inserted
// right after the CommandOrControl/Cmd/Ctrl modifier. Accelerators that
// already include Alt have no separate global variant.
export function deriveGlobalAccelerator(accelerator: string): string | null {
  const parts = accelerator.split('+');
  if (parts.includes('Alt')) return null;

  const primaryModifiers = [
    'CommandOrControl',
    'Command',
    'Cmd',
    'Control',
    'Ctrl',
  ];
  const modifierIndex = parts.findIndex((part) =>
    primaryModifiers.includes(part)
  );
  if (modifierIndex === -1) return null;

  const partsWithAlt = [...parts];
  partsWithAlt.splice(modifierIndex + 1, 0, 'Alt');
  return partsWithAlt.join('+');
}

// Why a keydown couldn't be turned into a shortcut, so the recorder can say
// something more useful than "invalid":
// - modifierOnly: just a modifier so far, keep waiting for the real key.
// - needModifier: no Cmd/Ctrl/Alt, plain keys must stay free for typing.
// - metaKeyUnsupported: the Windows/Super key on Windows/Linux (see below).
// - unsupportedKey: a key the recorder doesn't know how to bind.
// - reservedUndoRedo / reservedEditing / reservedAppWindow: a chord the app
//   or the OS already uses (see RESERVED_ACCELERATORS).
export type AcceleratorRejection =
  | 'modifierOnly'
  | 'needModifier'
  | 'metaKeyUnsupported'
  | 'unsupportedKey'
  | 'reservedUndoRedo'
  | 'reservedEditing'
  | 'reservedAppWindow';

export type KeyboardEventAcceleratorResult =
  | { accelerator: string }
  | { rejection: AcceleratorRejection; accelerator?: string };

// Chords a custom shortcut must never take over. Shortcuts are registered
// with globalShortcut while the control window is focused, which fires
// before the renderer sees the key, so binding one of these would silently
// break match undo/redo (the Dashboard's Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z),
// copy/paste in every text field, or quitting/closing the app. On macOS the
// Dashboard's undo handler also accepts the Control key, so the Control
// spellings of undo/redo are reserved there too.
const RESERVED_ACCELERATORS: Record<string, AcceleratorRejection> = {
  'CommandOrControl+Z': 'reservedUndoRedo',
  'CommandOrControl+Shift+Z': 'reservedUndoRedo',
  'Control+Z': 'reservedUndoRedo',
  'Control+Shift+Z': 'reservedUndoRedo',
  'CommandOrControl+C': 'reservedEditing',
  'CommandOrControl+V': 'reservedEditing',
  'CommandOrControl+X': 'reservedEditing',
  'CommandOrControl+A': 'reservedEditing',
  'CommandOrControl+Q': 'reservedAppWindow',
  'CommandOrControl+W': 'reservedAppWindow',
};

// The renderer has no `process`, so the OS comes from navigator.platform
// ("MacIntel", "Win32", "Linux x86_64", ...). Only macOS and Windows need
// telling apart here; anything else behaves like Linux.
function detectAcceleratorPlatform(): string {
  const platform =
    typeof navigator === 'undefined' ? '' : navigator.platform.toLowerCase();
  if (platform.startsWith('mac')) return 'darwin';
  if (platform.startsWith('win')) return 'win32';
  return 'linux';
}

// Builds an Electron accelerator string from a keydown event's modifier
// flags and physical key. Uses `code` (not `key`) for the main key so a
// shifted digit/letter (e.g. Shift+2 producing '@' on a US layout) still
// resolves to the physical "2"/"B" key. Rejects modifier-only keydowns,
// unsupported keys, bindings with no non-Shift modifier (plain
// letters/space must stay free for normal typing) and reserved chords.
//
// Modifier mapping depends on `platform` (a Node-style process.platform
// value; injectable for tests, detected from the renderer otherwise):
// - macOS: Cmd is `CommandOrControl` (which means Cmd there) and Ctrl is
//   `Control`, so Ctrl+Shift+H is saved as exactly that rather than
//   silently becoming Cmd+Shift+H.
// - Windows/Linux: Ctrl is `CommandOrControl` (which means Ctrl there). The
//   Windows/Super key is refused rather than mapped: most Win+key chords
//   belong to the OS shell, globalShortcut can't reliably register them,
//   and mapping it to Ctrl (as this used to) saved a different chord from
//   the one pressed.
export function keyboardEventToAccelerator(
  {
    metaKey,
    ctrlKey,
    altKey,
    shiftKey,
    key,
    code,
  }: {
    metaKey: boolean;
    ctrlKey: boolean;
    altKey: boolean;
    shiftKey: boolean;
    key: string;
    code: string;
  },
  platform: string = detectAcceleratorPlatform()
): KeyboardEventAcceleratorResult {
  if (['Control', 'Meta', 'Alt', 'Shift'].includes(key)) {
    return { rejection: 'modifierOnly' };
  }

  const isMac = platform === 'darwin';
  if (!isMac && metaKey) return { rejection: 'metaKeyUnsupported' };
  if (!metaKey && !ctrlKey && !altKey) return { rejection: 'needModifier' };

  const modifiers: string[] = [];
  if (isMac) {
    if (metaKey) modifiers.push('CommandOrControl');
    if (ctrlKey) modifiers.push('Control');
  } else if (ctrlKey) {
    modifiers.push('CommandOrControl');
  }
  if (altKey) modifiers.push('Alt');
  if (shiftKey) modifiers.push('Shift');

  let mainKey: string | null = null;
  if (code === 'Space') {
    mainKey = 'Space';
  } else if (/^Key[A-Z]$/.test(code)) {
    mainKey = code.slice(3);
  } else if (/^Digit[0-9]$/.test(code)) {
    mainKey = code.slice(5);
  } else if (/^F(?:[1-9]|1[0-9]|2[0-4])$/.test(code)) {
    mainKey = code;
  }

  if (!mainKey) return { rejection: 'unsupportedKey' };

  const accelerator = [...modifiers, mainKey].join('+');
  // The Control+ spellings can only come out of the macOS branch above, so
  // one lookup covers both platforms.
  const reserved = RESERVED_ACCELERATORS[accelerator];
  if (reserved) return { rejection: reserved, accelerator };

  return { accelerator };
}

// The active browser-source settings: user configuration layered over the
// defaults (off, port 4750), so a config.json with no `browserSource` field
// (or one missing `port`/`enabled`) behaves exactly like today, no server.
// Shared by main.ts (server lifecycle) and the renderer (settings UI).
export function getBrowserSourceSettings(
  appSettings: AppSettings
): BrowserSourceSettings {
  return {
    ...defaultBrowserSourceSettings,
    ...appSettings.browserSource,
  };
}

// The active phone-remote settings: user configuration layered over the
// defaults (off, port 3006), so a config.json with no `remoteControl` field
// (or one missing `port`/`enabled`) behaves exactly like today, no server.
// Shared by main.ts (server lifecycle) and the renderer (settings UI), the
// same defaults-over-settings pattern as getBrowserSourceSettings.
export function getRemoteControlSettings(
  appSettings: AppSettings
): RemoteControlSettings {
  return {
    ...defaultRemoteControlSettings,
    ...appSettings.remoteControl,
  };
}

// Splits `items` into consecutive chunks of at most `size` elements each.
// Used to page the Stream Deck's button sets (5 usable keys per set) across
// however many phases/screens the current match settings produce. A
// non-positive size can't make progress, so it degenerates to a single
// chunk rather than looping forever.
export function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];

  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

// Seconds remaining until a "HH:MM" kick-off time, interpreted as today in
// the local timezone. Returns null when the string isn't a valid 24-hour
// HH:MM time or the moment has already arrived/passed today (no next-day
// rollover, a kick-off time is only ever "today"). Uses Math.ceil so a
// consumer ticking once a second never displays 0 while time remains.
export function secondsUntilKickOff(
  kickOffTime: string,
  now: Date
): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(kickOffTime);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;

  const kickOff = new Date(now);
  kickOff.setHours(hours, minutes, 0, 0);

  const diffMs = kickOff.getTime() - now.getTime();
  if (diffMs <= 0) return null;

  return Math.ceil(diffMs / 1000);
}

// Maps a BCP-47-ish locale string (as reported by navigator.language) to the
// nearest of the eight shipped catalogues. Pure and side-effect free so it's
// trivially unit-testable; the navigator/Intl read happens at the call site
// (see detectLanguage below), not in here.
export function nearestSupportedLanguage(locale: string): LanguageCode {
  const lower = locale.toLowerCase();

  if (lower.startsWith('pt')) {
    // pt-BR -> pt-BR; pt or pt-PT (or any other pt-XX, e.g. pt-AO) -> pt-PT.
    return lower === 'pt-br' || lower.startsWith('pt-br') ? 'pt-BR' : 'pt-PT';
  }
  if (lower.startsWith('es')) {
    // es-ES (incl. extension locales like es-ES-u-nu-latn) -> es-ES; any
    // other Spanish (bare "es", es-MX, es-AR, es-419, ...) -> es-419, the
    // neutral pan-regional Latin American catalogue.
    return lower === 'es-es' || lower.startsWith('es-es-') ? 'es-ES' : 'es-419';
  }
  if (lower.startsWith('fr')) return 'fr';
  if (lower.startsWith('de')) return 'de';
  if (lower.startsWith('it')) return 'it';

  return 'en';
}

// The OS/browser locale mapped to the nearest supported catalogue. Used to
// pre-select the first-run language picker and as the fallback wherever an
// AppSettings.language hasn't been chosen yet (see getLanguage below).
export function detectLanguage(): LanguageCode {
  if (typeof navigator === 'undefined') return 'en';

  const locale =
    navigator.language ||
    (navigator.languages && navigator.languages[0]) ||
    'en';

  return nearestSupportedLanguage(locale);
}

// The active display language: the operator's explicit choice if one has
// been made, otherwise the detected OS/browser locale. Same
// defaults-layered-over-settings pattern as getKeyboardShortcuts/
// getBrowserSourceSettings, so a config.json with no `language` field (every
// config saved before v0.18) behaves exactly like a fresh install rather
// than throwing or rendering untranslated.
export function getLanguage(appSettings: AppSettings): LanguageCode {
  return appSettings.language ?? detectLanguage();
}

export const debounce = <Args extends unknown[]>(
  func: (...args: Args) => void,
  delay: number
) => {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Args) => {
    clearTimeout(timer);
    timer = setTimeout(() => func(...args), delay);
  };
};
