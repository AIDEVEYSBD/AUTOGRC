/**
 * AutoX ID (SSO) constants and pure helpers.
 *
 * Discovery document: https://sso.autogrc.cloud/.well-known/openid-configuration
 * Integration guide:  https://sso.autogrc.cloud/integration.md
 *
 * Everything here is framework-free and side-effect-free so it can be unit
 * tested and reused on both the server and (the health probe) the client.
 */

/** Issuer origin, trailing slashes stripped. Overridable via AUTOX_ISSUER. */
export const ISSUER = (process.env.AUTOX_ISSUER || "https://sso.autogrc.cloud").replace(/\/+$/, "");

export const SSO_ENDPOINTS = {
  authorization: `${ISSUER}/auth`,
  token: `${ISSUER}/token`,
  userinfo: `${ISSUER}/me`,
  jwks: `${ISSUER}/jwks`,
  endSession: `${ISSUER}/session/end`,
  health: `${ISSUER}/health`,
} as const;

/**
 * Scopes requested at login — the guide's standard request. We intentionally do
 * NOT request `offline_access` (+ prompt=consent): AutoGRC re-authenticates on
 * session expiry rather than using refresh tokens, so none is issued.
 */
export const SCOPE = "openid profile email orgs roles";

/**
 * API resource indicator. Requesting this makes AutoX ID issue a **JWT** access
 * token that carries `autox:app_roles` (application-specific roles). Without it
 * the access token is opaque and app roles are unavailable. See guide → "JWT
 * Access Token (when `resource=https://sso.autogrc.cloud/api` is requested)".
 */
export const API_RESOURCE = `${ISSUER}/api`;

export interface EndSessionParams {
  /**
   * ID token from the session. Mandatory per the guide — without it the SSO
   * cannot validate `post_logout_redirect_uri` and will not redirect back.
   */
  idToken?: string | null;
  /** Absolute URL the SSO redirects to after logout (must be registered). */
  postLogoutRedirectUri: string;
  /** Opaque CSRF value echoed back on the redirect. */
  state?: string;
}

/**
 * Build the RP-initiated logout URL for the SSO end_session_endpoint.
 * See guide → "Logout Implementation".
 */
export function buildEndSessionUrl(params: EndSessionParams): string {
  const url = new URL(SSO_ENDPOINTS.endSession);
  if (params.idToken) url.searchParams.set("id_token_hint", params.idToken);
  url.searchParams.set("post_logout_redirect_uri", params.postLogoutRedirectUri);
  if (params.state) url.searchParams.set("state", params.state);
  return url.toString();
}

type HealthResponse = { ok: boolean; json: () => Promise<unknown> };
type FetchLike = (input: string, init?: { cache?: string; headers?: Record<string, string> }) => Promise<HealthResponse>;

export interface ProbeOptions {
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  intervalMs?: number;
  /** Injectable clock (defaults to Date.now) — keeps the loop unit-testable. */
  now?: () => number;
  /** Injectable delay (defaults to setTimeout) — keeps tests instant. */
  sleep?: (ms: number) => Promise<void>;
}

/**
 * Cold-start probe for the scale-to-zero SSO. Polls /health until it reports
 * `{ status: "ok" }` or the deadline passes; returns true once healthy.
 * See guide → "Cold Start Handling".
 */
export async function probeSsoHealth(opts: ProbeOptions = {}): Promise<boolean> {
  const fetchImpl = opts.fetchImpl ?? (globalThis.fetch as unknown as FetchLike);
  const timeoutMs = opts.timeoutMs ?? 60_000;
  const intervalMs = opts.intervalMs ?? 2_000;
  const now = opts.now ?? (() => Date.now());
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));

  const deadline = now() + timeoutMs;
  while (now() < deadline) {
    try {
      const r = await fetchImpl(SSO_ENDPOINTS.health, {
        cache: "no-store",
        headers: { accept: "application/json" },
      });
      if (r.ok) {
        const body = (await r.json().catch(() => null)) as { status?: string } | null;
        if (body && body.status === "ok") return true;
      }
    } catch {
      /* SSO still waking up — retry until the deadline */
    }
    if (now() >= deadline) break;
    await sleep(intervalMs);
  }
  return false;
}
