import { LicenceKeyData } from '../zodSchemas';
import { setIsDemoMode } from './isDemoMode';
import { getLicenceKey, getRenewalJWT } from './storage';
import { validateJWT, validateRenewalJWT } from './validateJWT';
import verifyJWT from './verifyJWT';

let licenceData: LicenceKeyData;

export default async function isLicensed() {
  const licenceKey = getLicenceKey() as string | undefined;
  if (!licenceKey) {
    return { licenced: false };
  }

  const data = verifyJWT(licenceKey);
  if (data === null) {
    return { licenced: false };
  }

  const renewalJWT = getRenewalJWT() as string | undefined;

  if (renewalJWT) {
    const renewalJWTData = verifyJWT(renewalJWT);
    if (renewalJWTData === null) {
      return { licenced: false };
    }
    const validatedRenewalJWT = await validateRenewalJWT(data, renewalJWTData);

    if (validatedRenewalJWT.success !== true) {
      return { licenced: false };
    }

    licenceData = {
      ...data,
      iat: renewalJWTData.iat,
      exp: renewalJWTData.exp,
    };
  } else {
    const validatedJWT = await validateJWT(data);

    if (validatedJWT.success !== true) {
      return { licenced: false };
    }

    licenceData = data;
  }

  setIsDemoMode(false);

  return { licenced: true };
}

export const getLicencedData = () => ({ ...licenceData });
