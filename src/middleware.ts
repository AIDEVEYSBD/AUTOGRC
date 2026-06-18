import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || 'autogrc-jwt-secret-2026-ey'
);
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
  '/integrations',
  '/settings',
];

// Role-gated route prefixes (defense-in-depth; pages/layouts also check).
const ROLE_GATES: { prefix: string; roles: string[] }[] = [
  { prefix: '/settings', roles: ['admin'] },
  { prefix: '/integrations', roles: ['admin', 'compliance_lead'] },
];

async function getClaims(token: string | undefined): Promise<{ role?: string } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as { role?: string };
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const claims = await getClaims(token);
  const authenticated = !!claims;

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  // Redirect unauthenticated users away from protected routes
  if (isProtected && !authenticated) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  // Role-based gating for admin/management routes
  if (authenticated) {
    const role = String(claims?.role ?? 'viewer');
    const gate = ROLE_GATES.find((g) => pathname.startsWith(g.prefix));
    if (gate && !gate.roles.includes(role)) {
      const overviewUrl = req.nextUrl.clone();
      overviewUrl.pathname = '/overview';
      return NextResponse.redirect(overviewUrl);
    }
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
    '/integrations/:path*',
    '/settings/:path*',
    '/login',
  ],
};
