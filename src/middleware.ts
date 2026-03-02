import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode('autogrc-jwt-secret-2026-ey');
const COOKIE_NAME = 'autogrc-token';

// Paths that require authentication
const PROTECTED_PREFIXES = [
  '/overview',
  '/applications',
  '/frameworks',
  '/landing',
  '/framework',
  '/soc',
  '/automation',
  '/capabilities',
];

async function isValidToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, SECRET);
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const authenticated = await isValidToken(token);

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  // Redirect unauthenticated users away from protected routes
  if (isProtected && !authenticated) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from login page
  if (pathname === '/login' && authenticated) {
    const overviewUrl = req.nextUrl.clone();
    overviewUrl.pathname = '/overview';
    return NextResponse.redirect(overviewUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/overview/:path*',
    '/applications/:path*',
    '/frameworks/:path*',
    '/landing/:path*',
    '/framework/:path*',
    '/soc/:path*',
    '/automation/:path*',
    '/capabilities/:path*',
    '/login',
  ],
};
