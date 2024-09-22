import { z } from 'zod';

export const licenceKeyDataSchema = z.object({
  machine_description: z.string(),
  machine_id: z.string(),
  app_name: z.string(),
  app_version: z.string(),
  email: z.string().email(),
  user_id: z.string(),
  product_code: z.string(),
  description: z.string(),
  refresh_token: z.string(),
  iat: z.number(),
  exp: z.number(),
});

export type LicenceKeyData = z.infer<typeof licenceKeyDataSchema>;

export const renewalJWTDataSchema = z.object({
  machine_id: z.string(),
  app_name: z.string(),
  product_code: z.string(),
  iat: z.number(),
  exp: z.number(),
});

export type RenewalJWTData = z.infer<typeof renewalJWTDataSchema>;

export const updatesSchema = z.object({
  latestVersion: z.string(),
  downloadUrl: z.string(),
});

export type Updates = z.infer<typeof updatesSchema>;

export interface UpdateStatus extends Updates {
  newVersionAvailable: boolean;
}

export const teamSetingsSchema = z.object({
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
});

export type TeamSettingsInterface = z.infer<typeof teamSetingsSchema>;
