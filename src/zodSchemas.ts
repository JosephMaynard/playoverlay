import { z } from 'zod';

export const updatesSchema = z.object({
  latestVersion: z.string(),
  downloadUrl: z.string(),
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
  awayTeamNameFull: z.string(),
  awayTeamNameAbbreviated: z.string(),
  awayTeamTextColour: z.optional(z.string()),
  awayTeamBackgroundColour: z.optional(z.string()),
  venue: z.optional(z.string()),
  saveTitle: z.optional(z.string()),
  kickOffTime: z.optional(z.string()),
  halfLength: z.optional(z.number()),
  extraTimeHalfLength: z.optional(z.number()),
  hasExtraTime: z.optional(z.boolean()),
  hasPenalties: z.optional(z.boolean()),
  hideCustomGraphics: z.optional(z.array(z.string())),
  hideScreens: z.optional(z.array(z.string())),
  saveDate: z.optional(z.string()),
  saveId: z.optional(z.string()),
});

export type MatchSettings = z.infer<typeof matchSetingsSchema>;
