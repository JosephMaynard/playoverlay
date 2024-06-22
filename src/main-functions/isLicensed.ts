import { setIsDemoMode } from './isDemoMode';
import { getLicenceKey } from './storage';
import validateJWT, { LicenceKeyData } from './validateJWT';
import verifyJWT from './verifyJWT';

let licenceData: LicenceKeyData;

// Licensing check function (placeholder)
export default async function isLicensed() {
  const licenceKey = getLicenceKey();
  if (!licenceKey) {
    return { licenced: false };
  }

  const data = verifyJWT(licenceKey);
  if (data === null) {
    return { licenced: false };
  }

  const validatedJWT = await validateJWT(data as LicenceKeyData);

  if (validatedJWT.success !== true) {
    return { licenced: false };
  }

  licenceData = data;
  setIsDemoMode(false);

  return { licenced: true };
}

export const getLicencedData = () => ({ ...licenceData });
