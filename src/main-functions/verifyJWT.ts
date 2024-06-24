import jwt from 'jsonwebtoken';
import { LicenceKeyData } from './validateJWT';

const publicKey = // @ts-ignore
  import.meta.env.VITE_JWT_PUBLIC_KEY?.replace(/\\n/g, '\n') ?? '';

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
