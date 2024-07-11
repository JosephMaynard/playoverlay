import { machineId } from 'node-machine-id';
import { z } from 'zod';

const licenceKeyDataSchema = z.object({
  machine_description: z.string(),
  machine_id: z.string(),
  app_name: z.string(),
  app_version: z.string(),
  email: z.string().email(),
  user_id: z.string(),
  product_code: z.string(),
  description: z.string(),
  iat: z.number(),
  exp: z.number(),
});

export type LicenceKeyData = z.infer<typeof licenceKeyDataSchema>;

export default async function validateJWT(decodedJWT: LicenceKeyData) {
  const validatedJWT = licenceKeyDataSchema.safeParse(decodedJWT);

  if (validatedJWT.success !== true) {
    return { success: false, error: 'Licence key data is incorrect' };
  }

  const machine_id = await machineId();

  if (validatedJWT.data.machine_id !== machine_id) {
    return {
      success: false,
      error: 'Licence key does not match system key',
    };
  }

  const currentTime = Math.floor(Date.now() / 1000);

  if (validatedJWT.data.exp < currentTime) {
    return {
      success: false,
      error: 'Licence key has expired',
    };
  }

  return { success: true };
}
