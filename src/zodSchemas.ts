import { z } from 'zod';
import { defaultAppSettings } from './constants';

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
  halfLength: z.number().positive().finite().max(300).optional().catch(undefined),
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
  browserSource: z
    .object({
      enabled: z.boolean(),
      port: z.number(),
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
