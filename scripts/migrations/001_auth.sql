-- Self-hosted auth for AutoGRC (additive only — does not touch existing tables).
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS app_users (
  id            text PRIMARY KEY,
  email         text NOT NULL UNIQUE,
  name          text NOT NULL DEFAULT '',
  role          text NOT NULL DEFAULT 'viewer',   -- admin | compliance_lead | assessor | viewer
  status        text NOT NULL DEFAULT 'invited',  -- active | invited | disabled
  password_hash text,
  invited_by    text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users (lower(email));

CREATE TABLE IF NOT EXISTS user_invitations (
  id          text PRIMARY KEY,
  email       text NOT NULL,
  role        text NOT NULL DEFAULT 'viewer',
  token_hash  text NOT NULL,
  invited_by  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL,
  accepted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON user_invitations (token_hash);
CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON user_invitations (lower(email));
