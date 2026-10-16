import {
  AppSettings,
  CustomScreen,
  ScreenRotationEntry,
  ScreenRotationSettings,
} from './types';
import type { MatchSettings } from './zodSchemas';
import {
  DisplayScreen,
  MAX_ROTATION_INTERVAL_SECONDS,
  MIN_ROTATION_INTERVAL_SECONDS,
  defaultScreenRotationSettings,
} from './constants';
import { isScreenOffered } from './lineup';

// Pure helpers for screen rotation (see ScreenRotationSettings): which
// screens can be rotated through, in what order, and which of the chosen
// ones can still be shown. The runtime state lives in store/screenRotation.

// The built-in screens a rotation can include, in the order it shows them.
// The order is fixed rather than chosen, so a rotation always runs the way
// the panel lists it: what's coming up, who's playing, then the score.
export const ROTATION_SCREEN_ORDER: DisplayScreen[] = [
  'matchTitle',
  'homeLineup',
  'awayLineup',
  'scoreBug',
  'scoreboard',
  'penalties',
  'endScreen',
];

// The rotation settings in effect: the operator's, over the defaults (none
// selected, 10 seconds, no auto-start).
export function getScreenRotationSettings(
  appSettings: AppSettings
): ScreenRotationSettings {
  return { ...defaultScreenRotationSettings, ...appSettings.screenRotation };
}

// The seconds per screen, kept within bounds whatever is stored, so a
// hand-edited value can never make the rotation spin.
export function rotationIntervalMs(settings: ScreenRotationSettings): number {
  const seconds = Number.isFinite(settings.intervalSeconds)
    ? Math.round(settings.intervalSeconds)
    : defaultScreenRotationSettings.intervalSeconds;
  return (
    Math.min(
      MAX_ROTATION_INTERVAL_SECONDS,
      Math.max(MIN_ROTATION_INTERVAL_SECONDS, seconds)
    ) * 1000
  );
}

function isFullScreenGraphic(graphic: CustomScreen): boolean {
  return (
    (graphic.type === undefined || graphic.type === 'screen') &&
    graphic.url !== null
  );
}

// Every screen that can go in the rotation now, in rotation order: the
// built-in screens the dashboard currently offers (so a team's line-up only
// once it has players, penalties only while they're on), then each
// full-screen custom graphic, identified by its image URL.
export function rotationCandidates(
  matchSettings: MatchSettings,
  customGraphics: CustomScreen[]
): ScreenRotationEntry[] {
  return [
    ...ROTATION_SCREEN_ORDER.filter((screen) =>
      isScreenOffered(screen, matchSettings)
    ).map((screen) => ({ screen })),
    ...customGraphics
      .filter(isFullScreenGraphic)
      .map((graphic): ScreenRotationEntry => ({
        screen: 'custom',
        customScreenImageUrl: graphic.url ?? undefined,
      })),
  ];
}

export function sameRotationEntry(
  left: ScreenRotationEntry,
  right: ScreenRotationEntry
): boolean {
  return (
    left.screen === right.screen &&
    (left.screen !== 'custom' ||
      left.customScreenImageUrl === right.customScreenImageUrl)
  );
}

// Whether a chosen screen can be shown now. One that can't (its graphic
// deleted, its line-up emptied, penalties switched off) is skipped rather
// than shown broken or blank.
export function isRotationEntryAvailable(
  entry: ScreenRotationEntry,
  matchSettings: MatchSettings,
  customGraphics: CustomScreen[]
): boolean {
  return rotationCandidates(matchSettings, customGraphics).some((candidate) =>
    sameRotationEntry(candidate, entry)
  );
}

// The chosen screens that can be shown now; a rotation needs two.
export function availableRotationEntries(
  settings: ScreenRotationSettings,
  matchSettings: MatchSettings,
  customGraphics: CustomScreen[]
): ScreenRotationEntry[] {
  return settings.screens.filter((entry) =>
    isRotationEntryAvailable(entry, matchSettings, customGraphics)
  );
}

// Adds or removes one screen, keeping the list in rotation order. Chosen
// screens that aren't offered just now (a line-up emptied for the moment)
// keep their place, so they come back when they can be shown again.
export function setRotationEntry(
  entries: ScreenRotationEntry[],
  entry: ScreenRotationEntry,
  included: boolean,
  customGraphics: CustomScreen[]
): ScreenRotationEntry[] {
  const others = entries.filter(
    (existing) => !sameRotationEntry(existing, entry)
  );
  if (!included) return others;
  const graphicUrls = customGraphics
    .filter(isFullScreenGraphic)
    .map((graphic) => graphic.url ?? undefined);
  const rank = (candidate: ScreenRotationEntry) => {
    if (candidate.screen !== 'custom') {
      return ROTATION_SCREEN_ORDER.indexOf(candidate.screen);
    }
    const position = graphicUrls.indexOf(candidate.customScreenImageUrl);
    return (
      ROTATION_SCREEN_ORDER.length +
      (position === -1 ? graphicUrls.length : position)
    );
  };
  return [...others, entry]
    .map((candidate, order) => ({ candidate, order }))
    .sort((a, b) => rank(a.candidate) - rank(b.candidate) || a.order - b.order)
    .map(({ candidate }) => candidate);
}

// The position of the next screen to show after `from`, wrapping round and
// skipping any that can't be shown now; -1 when none can. Pass -1 as `from`
// for the first.
export function nextRotationIndex(
  entries: ScreenRotationEntry[],
  from: number,
  isAvailable: (entry: ScreenRotationEntry) => boolean
): number {
  for (let step = 1; step <= entries.length; step += 1) {
    const index = (from + step + entries.length) % entries.length;
    if (isAvailable(entries[index])) return index;
  }
  return -1;
}
