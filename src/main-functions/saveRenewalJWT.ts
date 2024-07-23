import { getLicenceKey, setRenewalJWT } from './storage';
import { validateRenewalJWT } from './validateJWT';
import verifyJWT from './verifyJWT';

export default async function saveRenewalJWT(renewalJWT: string) {
  const decodedJWT = verifyJWT(renewalJWT);
  if (decodedJWT === null) {
    return { success: false, error: 'Licence key invalid' };
  }

  const licenceKey = await getLicenceKey();

  const decodedLicenceKey = verifyJWT(licenceKey as string);

  const validatedJWT = await validateRenewalJWT(decodedLicenceKey, decodedJWT);

  if (validatedJWT.success === false) {
    return {
      success: false,
      error: validatedJWT?.error || 'A validation error occured',
    };
  }

  setRenewalJWT(renewalJWT);

  return { success: true };
}
