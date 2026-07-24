import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

// Edge-safe Auth.js instance (no DB). `req.auth` carries the session — including
// the derived `role` — via the session callback in authConfig.
const { auth } = NextAuth(authConfig);

// Paths that require authentication.
const PROTECTED_PREFIXES = [
  "/overview",
  "/applications",
  "/frameworks",
  "/landing",
  "/framework",
  "/soc",
  "/automation",
  "/capabilities",
  "/integrations",
  "/settings",
];

// Role-gated route prefixes (defense-in-depth; pages/layouts also check).
const ROLE_GATES: { prefix: string; roles: string[] }[] = [
  { prefix: "/settings", roles: ["admin"] },
  { prefix: "/integrations", roles: ["admin", "compliance_lead"] },
];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const authenticated = !!session?.user;
  const role = String(session?.user?.role ?? "viewer");

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  // Send unauthenticated users to the sign-in page, preserving where they were headed.
  if (isProtected && !authenticated) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("callbackUrl", pathname + req.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based gating for admin/management routes.
  if (authenticated) {
    const gate = ROLE_GATES.find((g) => pathname.startsWith(g.prefix));
    if (gate && !gate.roles.includes(role)) {
      const overviewUrl = req.nextUrl.clone();
      overviewUrl.pathname = "/overview";
      overviewUrl.search = "";
      return NextResponse.redirect(overviewUrl);
    }
  }

  // Authenticated users have no business on the sign-in page.
  if (pathname === "/login" && authenticated) {
    const overviewUrl = req.nextUrl.clone();
    overviewUrl.pathname = "/overview";
    overviewUrl.search = "";
    return NextResponse.redirect(overviewUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/overview/:path*",
    "/applications/:path*",
    "/frameworks/:path*",
    "/landing/:path*",
    "/framework/:path*",
    "/soc/:path*",
    "/automation/:path*",
    "/capabilities/:path*",
    "/integrations/:path*",
    "/settings/:path*",
    "/login",
  ],
};
