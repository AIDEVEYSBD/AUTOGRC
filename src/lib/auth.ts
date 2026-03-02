import { SignJWT, jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode('autogrc-jwt-secret-2026-ey');
const COOKIE_NAME = 'autogrc-token';

// Hardcoded credentials — swap to env vars when productionising
const VALID_USERNAME = 'SBD';
const VALID_PASSWORD = 'WeMakeGoodRAG';

export { COOKIE_NAME };

export function validateCredentials(username: string, password: string): boolean {
  return username === VALID_USERNAME && password === VALID_PASSWORD;
}

export async function signToken(): Promise<string> {
  return new SignJWT({ authenticated: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, SECRET);
    return true;
  } catch {
    return false;
  }
}
