/**
 * Authorization helpers for AutoGRC.
 *
 * Identity and roles come from AutoX ID (the SSO) on every login and are
 * re-derived from the token on each request — never persisted locally as the
 * source of truth (per https://sso.autogrc.cloud/integration.md).
 *
 * Configure these four role names in the AutoX ID admin board and assign them
 * to users there. They arrive as directory roles (`autox:roles`) in the ID
 * token, and/or application roles (`autox:app_roles`) in a JWT access token.
 */

export type Role = "admin" | "compliance_lead" | "assessor" | "viewer";

/** Highest privilege first. When a user carries several roles, the first match wins. */
export const ROLE_PRECEDENCE: readonly Role[] = ["admin", "compliance_lead", "assessor", "viewer"];

/** Subset of ID-token / access-token claims we read for authorization. */
export interface SsoClaims {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  preferred_username?: string;
  "autox:is_ey_employee"?: boolean;
  "autox:org_type"?: "EY" | "client" | string;
  "autox:orgs"?: unknown[];
  /** Deduplicated directory roles (present in the ID token). */
  "autox:roles"?: string[];
  /** Application-specific roles (present in the JWT access token, if requested). */
  "autox:app_roles"?: string[];
  [key: string]: unknown;
}

const KNOWN_ROLES = new Set<string>(ROLE_PRECEDENCE);

/**
 * Resolve the app role from SSO claims. Reads application roles and directory
 * roles, keeps only names the app knows, and returns the highest-privilege one.
 * Unknown or missing → "viewer" (least privilege).
 */
export function roleFromClaims(claims: SsoClaims | null | undefined): Role {
  if (!claims) return "viewer";
  const appRoles = Array.isArray(claims["autox:app_roles"]) ? claims["autox:app_roles"] : [];
  const dirRoles = Array.isArray(claims["autox:roles"]) ? claims["autox:roles"] : [];
  const present = new Set([...appRoles, ...dirRoles].map((r) => String(r)).filter((r) => KNOWN_ROLES.has(r)));
  for (const role of ROLE_PRECEDENCE) {
    if (present.has(role)) return role;
  }
  return "viewer";
}

export type Permission = "read" | "write" | "manage_integrations" | "manage_users" | "admin";

/**
 * What each role may do inside AutoGRC. Mirrors the existing route/nav gates:
 *  - admin: everything (settings, user management, integrations)
 *  - compliance_lead: read/write + manage integrations
 *  - assessor: read/write
 *  - viewer: read only
 */
export const APP_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  admin: new Set(["read", "write", "manage_integrations", "manage_users", "admin"]),
  compliance_lead: new Set(["read", "write", "manage_integrations"]),
  assessor: new Set(["read", "write"]),
  viewer: new Set(["read"]),
};

/** Does this role have the given permission? */
export function can(role: Role | undefined | null, perm: Permission): boolean {
  if (!role) return false;
  return APP_PERMISSIONS[role]?.has(perm) ?? false;
}

/** True only for the admin role (settings / user-management surface). */
export function isAdmin(role: Role | undefined | null): boolean {
  return role === "admin";
}
