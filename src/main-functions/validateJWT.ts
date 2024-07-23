import { machineId } from 'node-machine-id';
import {
  LicenceKeyData,
  licenceKeyDataSchema,
  RenewalJWTData,
  renewalJWTDataSchema,
} from '../zodSchemas';

export async function validateJWT(decodedJWT: LicenceKeyData) {
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

export async function validateRenewalJWT(
  decodedJWT: LicenceKeyData,
  decodedRenewalJWT: RenewalJWTData
) {
  const validatedJWT = licenceKeyDataSchema.safeParse(decodedJWT);

  if (validatedJWT.success !== true) {
    console.error(validatedJWT);
    return {
      success: false,
      error: 'validateRenewalJWT Licence key data is incorrect',
    };
  }
  const validatedRenewalJWT = renewalJWTDataSchema.safeParse(decodedRenewalJWT);

  if (validatedRenewalJWT.success !== true) {
    return { success: false, error: 'Renewal data is incorrect' };
  }

  const machine_id = await machineId();

  if (
    validatedJWT.data.machine_id !== machine_id ||
    validatedRenewalJWT.data.machine_id !== machine_id ||
    validatedJWT.data.machine_id !== validatedRenewalJWT.data.machine_id
  ) {
    return {
      success: false,
      error: 'Licence key does not match system key',
    };
  }

  const currentTime = Math.floor(Date.now() / 1000);

  if (validatedRenewalJWT.data.exp < currentTime) {
    return {
      success: false,
      error: 'Licence key has expired',
    };
  }

  return { success: true };
}
