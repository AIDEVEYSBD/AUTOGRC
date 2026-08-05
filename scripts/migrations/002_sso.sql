-- AutoX ID (SSO) provisioning table. Users are keyed on the stable OIDC `sub`.
-- Additive + idempotent: safe to re-run. Roles are NOT stored here — they come
-- from the token on every request (never a local source of truth).

CREATE TABLE IF NOT EXISTS sso_users (
  sub            text PRIMARY KEY,
  email          text NOT NULL,
  email_verified boolean NOT NULL DEFAULT false,
  name           text NOT NULL DEFAULT '',
  org_type       text,
  is_ey_employee boolean,
  created_at     timestamptz NOT NULL DEFAULT now(),
  last_login_at  timestamptz
);

CREATE INDEX IF NOT EXISTS idx_sso_users_email ON sso_users (lower(email));
