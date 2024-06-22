import { app } from 'electron';
import { setLicenceKey } from './storage';
import validateJWT, { LicenceKeyData } from './validateJWT';
import verifyJWT from './verifyJWT';

export default async function saveLicenceKey(licenceKey: string) {
  const decodedJWT = verifyJWT(licenceKey);
  if (decodedJWT === null) {
    return { success: false, error: 'Licence key invalid' };
  }

  const validatedJWT = await validateJWT(decodedJWT as LicenceKeyData);

  if (validatedJWT.success === false) {
    return {
      success: false,
      error: validatedJWT?.error || 'A validation error occured',
    };
  }

  setLicenceKey(licenceKey);
  app.relaunch();
  app.exit();

  return { success: true };
}
