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
