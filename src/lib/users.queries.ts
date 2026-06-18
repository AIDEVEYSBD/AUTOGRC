import "server-only";
import { db } from "@/lib/db";
import { hashPassword, type Role, type SessionClaims } from "@/lib/auth";
import { randomBytes, randomUUID, createHash } from "node:crypto";

export type UserStatus = "active" | "invited" | "disabled";

export interface AppUserRow {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: UserStatus;
  password_hash: string | null;
  created_at?: string;
  last_login_at?: string | null;
}

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

export async function getUserByEmail(email: string): Promise<AppUserRow | null> {
  const rows = await db<AppUserRow[]>`
    SELECT id, email, name, role, status, password_hash
    FROM app_users
    WHERE lower(email) = ${email.toLowerCase()}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function getUserById(id: string): Promise<AppUserRow | null> {
  const rows = await db<AppUserRow[]>`
    SELECT id, email, name, role, status, password_hash
    FROM app_users WHERE id = ${id} LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function listUsers(): Promise<Omit<AppUserRow, "password_hash">[]> {
  return db<Omit<AppUserRow, "password_hash">[]>`
    SELECT id, email, name, role, status, created_at, last_login_at
    FROM app_users
    ORDER BY created_at ASC
  `;
}

export async function setLastLogin(id: string): Promise<void> {
  await db`UPDATE app_users SET last_login_at = now() WHERE id = ${id}`;
}

export async function updateUser(
  id: string,
  patch: { role?: Role; status?: UserStatus }
): Promise<void> {
  if (patch.role !== undefined) await db`UPDATE app_users SET role = ${patch.role} WHERE id = ${id}`;
  if (patch.status !== undefined) await db`UPDATE app_users SET status = ${patch.status} WHERE id = ${id}`;
}

/** Set a new password (used by the reset flow). Returns session claims, or null if no active user. */
export async function setUserPassword(email: string, password: string): Promise<SessionClaims | null> {
  const ph = hashPassword(password);
  const rows = await db<{ id: string; email: string; name: string; role: Role }[]>`
    UPDATE app_users
    SET password_hash = ${ph}, status = 'active'
    WHERE lower(email) = ${email.toLowerCase()} AND status <> 'disabled'
    RETURNING id, email, name, role
  `;
  const u = rows[0];
  return u ? { sub: u.id, email: u.email, name: u.name, role: u.role } : null;
}

/**
 * Create (or refresh) an invitation for an email. Returns the RAW token to put
 * in the accept link. Also upserts a placeholder app_users row (status=invited).
 */
export async function createInvitation(opts: {
  email: string;
  name?: string;
  role: Role;
  invitedBy?: string;
}): Promise<{ token: string; email: string }> {
  const email = opts.email.toLowerCase();
  const name = opts.name ?? "";
  const raw = randomBytes(32).toString("base64url");
  const tokenHash = sha256(raw);

  await db`
    INSERT INTO app_users (id, email, name, role, status, invited_by)
    VALUES (${randomUUID()}, ${email}, ${name}, ${opts.role}, 'invited', ${opts.invitedBy ?? null})
    ON CONFLICT (email) DO UPDATE
      SET role = EXCLUDED.role, name = COALESCE(NULLIF(EXCLUDED.name, ''), app_users.name)
      WHERE app_users.status <> 'active'
  `;

  await db`
    INSERT INTO user_invitations (id, email, role, token_hash, invited_by, expires_at)
    VALUES (${randomUUID()}, ${email}, ${opts.role}, ${tokenHash}, ${opts.invitedBy ?? null}, now() + interval '7 days')
  `;

  return { token: raw, email };
}

/** Look up a pending invitation by raw token (for the accept page to show the email). */
export async function getInvitationByToken(
  raw: string
): Promise<{ email: string; role: Role } | null> {
  const rows = await db<{ email: string; role: Role }[]>`
    SELECT email, role FROM user_invitations
    WHERE token_hash = ${sha256(raw)} AND accepted_at IS NULL AND expires_at > now()
    ORDER BY created_at DESC LIMIT 1
  `;
  return rows[0] ?? null;
}

/** Accept an invitation: set the user's name + password, activate, mark used. */
export async function acceptInvitation(
  raw: string,
  name: string,
  password: string
): Promise<SessionClaims | null> {
  const tokenHash = sha256(raw);
  const invs = await db<{ id: string; email: string; role: Role }[]>`
    SELECT id, email, role FROM user_invitations
    WHERE token_hash = ${tokenHash} AND accepted_at IS NULL AND expires_at > now()
    ORDER BY created_at DESC LIMIT 1
  `;
  const inv = invs[0];
  if (!inv) return null;

  const email = inv.email.toLowerCase();
  const ph = hashPassword(password);

  let updated = await db<{ id: string; email: string; name: string; role: Role }[]>`
    UPDATE app_users
    SET name = ${name}, password_hash = ${ph}, status = 'active'
    WHERE lower(email) = ${email}
    RETURNING id, email, name, role
  `;
  if (!updated[0]) {
    updated = await db<{ id: string; email: string; name: string; role: Role }[]>`
      INSERT INTO app_users (id, email, name, role, status, password_hash)
      VALUES (${randomUUID()}, ${email}, ${name}, ${inv.role}, 'active', ${ph})
      RETURNING id, email, name, role
    `;
  }

  await db`UPDATE user_invitations SET accepted_at = now() WHERE id = ${inv.id}`;

  const u = updated[0];
  return { sub: u.id, email: u.email, name: u.name, role: u.role };
}
