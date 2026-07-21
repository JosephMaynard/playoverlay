import { z } from 'zod';
import {
  defaultAppSettings,
  defaultBrowserSourceSettings,
  defaultMatchState,
  defaultRemoteControlSettings,
  defaultScores,
  screens,
  DisplayScreen,
} from './constants';
import { CustomScreen, Penalty, supportedLanguageCodes } from './types';

export const updatesSchema = z.object({
  latestVersion: z.string(),
  downloadUrl: z.string(),
});

// Relevant fields of the GitHub "get latest release" API response
export const githubReleaseSchema = z.object({
  tag_name: z.string(),
  html_url: z.string(),
});

export type Updates = z.infer<typeof updatesSchema>;

export interface UpdateStatus extends Updates {
  newVersionAvailable: boolean;
}

export const matchSetingsSchema = z.object({
  homeTeamNameFull: z.string(),
  homeTeamNameAbbreviated: z.string(),
  homeTeamTextColour: z.optional(z.string()),
  homeTeamBackgroundColour: z.optional(z.string()),
  homeTeamLogo: z.optional(z.string()),
  awayTeamNameFull: z.string(),
  awayTeamNameAbbreviated: z.string(),
  awayTeamTextColour: z.optional(z.string()),
  awayTeamBackgroundColour: z.optional(z.string()),
  awayTeamLogo: z.optional(z.string()),
  venue: z.optional(z.string()),
  saveTitle: z.optional(z.string()),
  kickOffTime: z.optional(z.string()),
  timerMode: z.optional(z.enum(['football', 'generic'])),
  // Constrained individually with .catch(undefined) rather than rejecting the
  // whole object: getVerifiedMatchSettings falls back to ALL defaults (team
  // names included) when the schema rejects the stored settings, so one bad
  // number must degrade to "use the default for this field" instead of
  // wiping the rest of the user's saved settings.
  halfLength: z
    .number()
    .positive()
    .finite()
    .max(300)
    .optional()
    .catch(undefined),
  extraTimeHalfLength: z
    .number()
    .positive()
    .finite()
    .max(300)
    .optional()
    .catch(undefined),
  hasExtraTime: z.optional(z.boolean()),
  hasPenalties: z.optional(z.boolean()),
  periodCount: z.number().int().positive().max(50).optional().catch(undefined),
  periodLength: z
    .number()
    .positive()
    .finite()
    .max(300)
    .optional()
    .catch(undefined),
  periodName: z.optional(z.string()),
  saveDate: z.optional(z.string()),
  saveId: z.optional(z.string()),
});

export type MatchSettings = z.infer<typeof matchSetingsSchema>;

// Stored app settings feed globalShortcut.register (which throws on a
// malformed accelerator string) and the browser-source server, so corrupt
// data must never make it out of storage unchecked. Same per-field
// degradation pattern as matchSetingsSchema: an individual bad field falls
// back to its default (or undefined) instead of failing the whole parse and
// discarding the user's remaining settings.
export const appSettingsSchema = z.object({
  keyColour: z.string().catch(defaultAppSettings.keyColour),
  autoSwitchScreens: z.boolean().catch(defaultAppSettings.autoSwitchScreens),
  clockFormat: z.enum(['24h', '12h']).optional().catch(undefined),
  // Unset (undefined) is a meaningful value here, it's what triggers the
  // first-run language picker, so an invalid stored value degrades to
  // undefined (re-showing the picker) rather than a default language.
  language: z.enum(supportedLanguageCodes).optional().catch(undefined),
  browserSource: z
    .object({
      enabled: z.boolean(),
      // Bounded to the valid TCP port range and degraded to the shipped
      // default port (rather than left out of range or non-integer) so a
      // corrupt/out-of-range value can never be handed to http.listen,
      // which would simply fail to bind.
      port: z
        .number()
        .int()
        .min(1)
        .max(65535)
        .catch(defaultBrowserSourceSettings.port),
    })
    .optional()
    .catch(undefined),
  remoteControl: z
    .object({
      enabled: z.boolean(),
      port: z
        .number()
        .int()
        .min(1)
        .max(65535)
        .catch(defaultRemoteControlSettings.port),
    })
    .optional()
    .catch(undefined),
  keyboardShortcuts: z
    .object({
      nextMatchPhase: z.string(),
      homeTeamScored: z.string(),
      awayTeamScored: z.string(),
    })
    .optional()
    .catch(undefined),
});

// The operator-action event a renderer sends alongside every captureUndo
// (see store/undo.ts and main.ts's 'log-match-event' handler). An OMITTED
// source stays undefined (main.ts then defaults it to 'laptop'), but a
// PRESENT-but-unrecognised source degrades to the explicit 'unknown' value
// rather than undefined: silently recording it as 'laptop' would misattribute
// the event, and 'unknown' is far less useful to lose than the event itself.
export const matchEventSourceSchema = z.enum([
  'laptop',
  'streamDeck',
  'phone',
  'unknown',
]);

export const matchEventLogSchema = z.object({
  action: z.string(),
  // matchEventSourceSchema.optional() lets an omitted source pass straight
  // through as undefined without ever reaching .catch(); .catch() only fires
  // when a source is present but fails the enum check, which is exactly the
  // "unrecognised" case this should map to 'unknown'.
  source: matchEventSourceSchema.optional().catch('unknown'),
});

// The remaining schemas below cover the IPC/storage trust boundaries that
// previously had no runtime validation at all (scores, clock, match state,
// custom screens, saved match settings, the live-match snapshot). Same
// graceful-degradation style throughout: an individual bad field falls back
// to a safe default instead of failing the whole parse, and a bad entry in a
// list is dropped rather than discarding the rest of the list.

export const homeOrAwaySchema = z.enum(['home', 'away']);

// Mirrors constants.ts's `screens` object, the single source of truth for
// DisplayScreen, so this can never drift from the set of screens the app
// actually knows how to render.
const displayScreenValues = Object.keys(screens) as [
  DisplayScreen,
  ...DisplayScreen[],
];
export const displayScreenSchema = z.enum(displayScreenValues);

export const penaltySchema = z.object({
  team: homeOrAwaySchema.catch('home'),
  result: z.enum(['scored', 'missed']).catch('missed'),
});

// A wholly non-array `penalties` value degrades to no penalties recorded;
// an individual malformed entry is dropped rather than resetting every
// other penalty already recorded in the match.
export const penaltyListSchema = z
  .array(z.unknown())
  .catch([])
  .transform((entries) =>
    entries.reduce<Penalty[]>((acc, entry) => {
      const parsed = penaltySchema.safeParse(entry);
      if (parsed.success) acc.push(parsed.data);
      return acc;
    }, [])
  );

export const scoresSchema = z.object({
  homeTeam: z
    .number()
    .int()
    .nonnegative()
    .finite()
    .catch(defaultScores.homeTeam),
  awayTeam: z
    .number()
    .int()
    .nonnegative()
    .finite()
    .catch(defaultScores.awayTeam),
  penalties: penaltyListSchema,
});

export const timeSchema = z.object({
  time: z.string().optional().catch(undefined),
  remainingTime: z.string().optional().catch(undefined),
  additionalTime: z.number().finite().optional().catch(undefined),
  paused: z.boolean().optional().catch(undefined),
  showAdditionalTime: z.boolean().optional().catch(undefined),
  // Phase ids are no longer a fixed football-only set (see MatchPhase in
  // types.ts), so any string is accepted here; getPhaseById already treats
  // an id that matches no known phase as "not found" rather than throwing.
  matchPhase: z.string().optional().catch(undefined),
});

// title/filePath/url are required by the CustomScreen type: an entry
// missing one of them entirely is corrupt beyond a single-field repair, so
// it's left to fail here and gets dropped by customScreenListSchema below
// rather than kept with a made-up title or path. type/overlayLinks are
// genuinely optional fields, so those degrade to undefined individually.
export const customScreenSchema = z.object({
  title: z.string(),
  filePath: z.string().nullable(),
  url: z.string().nullable(),
  type: z.enum(['screen', 'overlay']).optional().catch(undefined),
  overlayLinks: z.array(displayScreenSchema).optional().catch(undefined),
});

// Parses a CustomScreen[] entry by entry so one corrupt graphic (e.g. from
// a hand-edited config.json) never discards every other saved graphic.
// Never throws: a wholly non-array value degrades to an empty list.
export const customScreenListSchema = z
  .array(z.unknown())
  .catch([])
  .transform((entries) =>
    entries.reduce<CustomScreen[]>((acc, entry) => {
      const parsed = customScreenSchema.safeParse(entry);
      if (parsed.success) acc.push(parsed.data);
      return acc;
    }, [])
  );

export const matchStateSchema = z.object({
  matchPhase: z.string().optional().catch(undefined),
  previousMatchPhase: z.string().optional().catch(undefined),
  displayScreen: displayScreenSchema.catch(defaultMatchState.displayScreen),
  penaltiesFirstTeam: homeOrAwaySchema.catch(
    defaultMatchState.penaltiesFirstTeam
  ),
  customScreenImageUrl: z.string().optional().catch(undefined),
  overlays: customScreenListSchema,
});

// Parses a MatchSettings[] entry by entry, the array counterpart of
// matchSetingsSchema: one saved match with e.g. a missing team name is
// dropped rather than discarding every other saved match in the list.
export const matchSettingsListSchema = z
  .array(z.unknown())
  .catch([])
  .transform((entries) =>
    entries.reduce<MatchSettings[]>((acc, entry) => {
      const parsed = matchSetingsSchema.safeParse(entry);
      if (parsed.success) acc.push(parsed.data);
      return acc;
    }, [])
  );

// Snapshot of the in-progress match persisted for crash recovery. scores/
// time/matchState are required fields of LiveMatch, so unlike the optional
// nested objects above (browserSource, keyboardShortcuts, ...) a totally
// corrupt nested value degrades to that whole field's own safe default
// (defaultScores/{}/defaultMatchState) rather than becoming optional.
export const liveMatchSchema = z.object({
  scores: scoresSchema.catch(defaultScores),
  time: timeSchema.catch({}),
  matchState: matchStateSchema.catch(defaultMatchState),
  savedAt: z
    .number()
    .finite()
    .catch(() => Date.now()),
  // Older snapshots predate this field; restore already falls back to
  // whatever match settings are currently loaded when it's absent.
  matchSettings: matchSetingsSchema.optional().catch(undefined),
});
