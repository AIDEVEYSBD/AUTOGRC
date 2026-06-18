import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "autogrc-jwt-secret-2026-ey"
);
const COOKIE_NAME = "autogrc-token";

export { COOKIE_NAME };

export type Role = "admin" | "compliance_lead" | "assessor" | "viewer";

export interface SessionClaims {
  sub: string; // user id
  email: string;
  name: string;
  role: Role;
}

/* ──────────────────────────────────────────────────────────────
   Legacy fallback — keeps the original single credential working
   even before the DB migration has run, so no one is locked out.
   ────────────────────────────────────────────────────────────── */
const LEGACY_USER = "SBD";
const LEGACY_PASSWORD = "WeMakeGoodRAG";

export function legacyCredentialsValid(identifier: string, password: string): boolean {
  return identifier === LEGACY_USER && password === LEGACY_PASSWORD;
}

/* ── JWT ── */
export async function signToken(claims: SessionClaims): Promise<string> {
  return new SignJWT({ ...claims, authenticated: true })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(SECRET);
}

export async function verifyToken(token: string | undefined): Promise<SessionClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return {
      sub: String(payload.sub ?? ""),
      email: String(payload.email ?? ""),
      name: String(payload.name ?? ""),
      role: (payload.role as Role) ?? "viewer",
    };
  } catch {
    return null;
  }
}

/** Short-lived signed token for magic-link / invite purposes. */
export async function signPurposeToken(purpose: string, email: string, ttl = "30m"): Promise<string> {
  return new SignJWT({ purpose, email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ttl)
    .sign(SECRET);
}

export async function verifyPurposeToken(
  token: string,
  purpose: string
): Promise<{ email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (payload.purpose !== purpose) return null;
    return { email: String(payload.email ?? "") };
  } catch {
    return null;
  }
}

/* ── Session helpers (server components / route handlers) ── */
export async function getSession(): Promise<SessionClaims | null> {
  const store = await cookies();
  return verifyToken(store.get(COOKIE_NAME)?.value);
}

/** Cookie options shared by every place that sets the session. */
export function sessionCookie(token: string) {
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 8,
    path: "/",
  };
}

/* ── Password hashing (scrypt; format matches scripts/migrate.mjs) ── */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const key = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const [scheme, saltHex, keyHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !keyHex) return false;
  try {
    const key = Buffer.from(keyHex, "hex");
    const derived = scryptSync(password, Buffer.from(saltHex, "hex"), key.length);
    return key.length === derived.length && timingSafeEqual(key, derived);
  } catch {
    return false;
  }
}
