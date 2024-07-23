import { app } from 'electron';
import { removeDemoModeTeamSettings, setLicenceKey } from './storage';
import { validateJWT } from './validateJWT';
import { LicenceKeyData } from '../zodSchemas';
import verifyJWT from './verifyJWT';

export default async function saveLicenceKey(
  licenceKey: string,
  restartApp?: boolean
) {
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

  if (restartApp === true) {
    removeDemoModeTeamSettings();
    app.relaunch();
    app.exit();
  }

  return { success: true };
}
