import { z } from 'zod';

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
  hideCustomGraphics: z.optional(z.array(z.string())),
  hideScreens: z.optional(z.array(z.string())),
  saveDate: z.optional(z.string()),
  saveId: z.optional(z.string()),
});

export type MatchSettings = z.infer<typeof matchSetingsSchema>;
