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
  halfLength: z.optional(z.number()),
  extraTimeHalfLength: z.optional(z.number()),
  hasExtraTime: z.optional(z.boolean()),
  hasPenalties: z.optional(z.boolean()),
  periodCount: z.optional(z.number()),
  periodLength: z.optional(z.number()),
  periodName: z.optional(z.string()),
  hideCustomGraphics: z.optional(z.array(z.string())),
  hideScreens: z.optional(z.array(z.string())),
  saveDate: z.optional(z.string()),
  saveId: z.optional(z.string()),
});

export type MatchSettings = z.infer<typeof matchSetingsSchema>;
