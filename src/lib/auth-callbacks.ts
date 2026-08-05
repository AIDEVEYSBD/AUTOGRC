/**
 * Pure claim-mapping used by the Auth.js callbacks in `src/auth.ts`.
 *
 * Kept framework-free so the mapping logic can be unit tested without the
 * Auth.js / Next runtime. `applyProfileToToken` runs once at sign-in;
 * `applyTokenToSession` runs whenever a session is read.
 */

import { roleFromClaims, type Role, type SsoClaims } from "@/lib/authz";

/** Fields we persist into the Auth.js JWT (server-side, encrypted httpOnly cookie). */
export interface TokenClaims {
  sub?: string;
  email?: string;
  name?: string;
  role?: Role;
  roles?: string[];
  orgs?: unknown[];
  isEyEmployee?: boolean;
  orgType?: string;
  /**
   * ID token — retained in the encrypted cookie solely for RP-initiated logout
   * (`id_token_hint`). Never copied into the client-facing session.
   */
  idToken?: string;
  [key: string]: unknown;
}

/** Minimal shape of the OIDC `account` passed to the jwt callback at sign-in. */
export interface OidcAccount {
  id_token?: string;
  access_token?: string;
  provider?: string;
  [key: string]: unknown;
}

/**
 * Map ID-token claims (+ account) into the Auth.js JWT. Runs once, at sign-in.
 * The derived `role` is always recomputed from claims — never trusted from any
 * pre-existing token/local state (guide: roles are not a local source of truth).
 *
 * Roles can live in the ID token (`autox:roles`, directory roles) and/or the JWT
 * access token (`autox:app_roles`, application roles). Pass every decoded token
 * as `roleSources` so we find the role wherever AutoX ID put it.
 */
export function applyProfileToToken<T extends Record<string, unknown>>(
  token: T,
  profile: SsoClaims,
  account?: OidcAccount | null,
  roleSources?: Array<SsoClaims | null | undefined>,
): T & TokenClaims {
  const prev = token as TokenClaims;
  const sources = ((roleSources && roleSources.length ? roleSources : [profile]).filter(Boolean) as SsoClaims[]);

  const appRoles = sources.flatMap((s) => (Array.isArray(s["autox:app_roles"]) ? s["autox:app_roles"]! : []));
  const dirRoles = sources.flatMap((s) => (Array.isArray(s["autox:roles"]) ? s["autox:roles"]! : []));
  const roleClaims: SsoClaims = { "autox:app_roles": appRoles, "autox:roles": dirRoles };

  const orgsSrc = sources.find((s) => Array.isArray(s["autox:orgs"]));
  const orgTypeSrc = sources.find((s) => typeof s["autox:org_type"] === "string");

  return {
    ...token,
    sub: profile.sub ?? prev.sub,
    email: profile.email ?? prev.email,
    name: profile.name ?? profile.preferred_username ?? prev.name,
    role: roleFromClaims(roleClaims),
    roles: [...new Set([...appRoles, ...dirRoles].map((r) => String(r)))],
    orgs: orgsSrc ? (orgsSrc["autox:orgs"] as unknown[]) : [],
    isEyEmployee: sources.some((s) => Boolean(s["autox:is_ey_employee"])),
    orgType: orgTypeSrc ? (orgTypeSrc["autox:org_type"] as string) : undefined,
    idToken: account?.id_token ?? prev.idToken,
  } as T & TokenClaims;
}

/** Client-facing session shape we expose (subset — augmented in next-auth.d.ts). */
export interface AppSession {
  user?: {
    id?: string;
    email?: string | null;
    name?: string | null;
    role?: Role;
    [key: string]: unknown;
  };
  roles?: string[];
  orgs?: unknown[];
  isEyEmployee?: boolean;
  orgType?: string;
  [key: string]: unknown;
}

/**
 * Copy JWT claims into the client-facing session object (mutates in place and
 * returns it). The ID token is deliberately NOT copied — it must never leave the
 * encrypted server cookie (guide: keep tokens server-side; never expose to JS).
 */
export function applyTokenToSession(session: AppSession, token: TokenClaims): AppSession {
  session.user = session.user ?? {};
  session.user.id = token.sub;
  session.user.role = token.role ?? "viewer";
  if (token.email) session.user.email = token.email;
  if (token.name) session.user.name = token.name;
  session.roles = token.roles ?? [];
  session.orgs = token.orgs ?? [];
  session.isEyEmployee = token.isEyEmployee ?? false;
  session.orgType = token.orgType;
  // token.idToken intentionally omitted.
  return session;
}
