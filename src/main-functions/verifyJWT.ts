import jwt from 'jsonwebtoken';
import { LicenceKeyData } from '../zodSchemas';

const publicKey = // @ts-ignore
  import.meta.env.VITE_JWT_PUBLIC_KEY?.replace(/\\n/g, '\n') ?? '';

export const checkJwtExpiration = (token: string): boolean => {
  const decoded = jwt.decode(token) as { exp: number };
  const currentTime = Math.floor(Date.now() / 1000);
  return decoded.exp < currentTime;
};

export const getJwtTimeLeft = (token: string): number => {
  const decoded = jwt.decode(token) as { exp: number };
  const currentTime = Math.floor(Date.now() / 1000);
  return decoded.exp - currentTime;
};

export default function verifyJWT(token: string) {
  try {
    const decoded = jwt.verify(token.trim(), publicKey.trim(), {
      algorithms: ['RS256'],
    }) as LicenceKeyData;
    return decoded;
  } catch (err) {
    console.error('Token verification failed:', err);
    return null;
  }
}
