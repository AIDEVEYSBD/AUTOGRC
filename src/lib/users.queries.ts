import "server-only";
import { db } from "@/lib/db";

/**
 * Local user provisioning for AutoX ID (SSO).
 *
 * Users are keyed on the stable OIDC `sub`, never on email (guide: "Key local
 * users on `sub`, never email"). Roles are NOT stored here — they come from the
 * token on every request and are never a local source of truth. The `sso_users`
 * table exists only for provisioning + read-only visibility in Settings.
 */

export interface ProvisionInput {
  sub: string;
  email: string;
  name: string;
  emailVerified?: boolean;
  orgType?: string;
  isEyEmployee?: boolean;
}

export interface ProvisionedUserRow {
  sub: string;
  email: string;
  name: string;
  org_type: string | null;
  is_ey_employee: boolean | null;
  created_at?: string;
  last_login_at?: string | null;
}

/**
 * Upsert the local record for an authenticated user, keyed by `sub`. Refreshes
 * mutable identity fields and stamps last_login_at. Called after successful
 * authentication, never as a gate.
 */
export async function provisionUser(input: ProvisionInput): Promise<void> {
  await db`
    INSERT INTO sso_users (sub, email, email_verified, name, org_type, is_ey_employee, last_login_at)
    VALUES (
      ${input.sub}, ${input.email}, ${input.emailVerified ?? false}, ${input.name},
      ${input.orgType ?? null}, ${input.isEyEmployee ?? null}, now()
    )
    ON CONFLICT (sub) DO UPDATE SET
      email          = EXCLUDED.email,
      email_verified = EXCLUDED.email_verified,
      name           = COALESCE(NULLIF(EXCLUDED.name, ''), sso_users.name),
      org_type       = EXCLUDED.org_type,
      is_ey_employee = EXCLUDED.is_ey_employee,
      last_login_at  = now()
  `;
}

/** Read-only list of provisioned users for the admin Settings surface. */
export async function listProvisionedUsers(): Promise<ProvisionedUserRow[]> {
  return db<ProvisionedUserRow[]>`
    SELECT sub, email, name, org_type, is_ey_employee, created_at, last_login_at
    FROM sso_users
    ORDER BY last_login_at DESC NULLS LAST, created_at ASC
  `;
}
