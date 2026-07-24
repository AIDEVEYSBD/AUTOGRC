import type { NextAuthConfig } from "next-auth";
import { customFetch } from "next-auth";
import { ISSUER, SCOPE, API_RESOURCE } from "@/lib/sso";
import { applyTokenToSession, type AppSession, type TokenClaims } from "@/lib/auth-callbacks";

/**
 * Inject the `resource` indicator into the token-exchange request body.
 * RFC 8707 wants `resource` on both the authorization and token requests; Auth.js
 * only sends it on the former, so without this the token endpoint returns an
 * OPAQUE access token and `autox:app_roles` is unavailable. Scoped to the token
 * endpoint; all other OAuth requests pass through untouched.
 */
function fetchWithResource(...args: Parameters<typeof fetch>): Promise<Response> {
  const [input, init] = args;
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
  if (init?.body instanceof URLSearchParams && url.includes("/token")) {
    if (!init.body.has("resource")) init.body.set("resource", API_RESOURCE);
  }
  return fetch(...args);
}

/**
 * Edge-safe Auth.js base config, shared by the middleware and the Node server
 * (`src/auth.ts`). It MUST NOT import anything that touches the database or the
 * Node runtime — provisioning lives only in the `jwt` callback in `src/auth.ts`.
 *
 * The `autox` provider is a generic OpenID Connect client against AutoX ID.
 * Auth.js performs issuer discovery and enforces the guide's security mandates:
 * Authorization Code + PKCE (S256), `state` (CSRF) and `nonce` (replay), ID
 * token validation (ES256 via JWKS; `iss`/`aud`/`exp`/`nonce`), and an encrypted
 * httpOnly + Secure session cookie (no tokens in localStorage).
 */
export const authConfig = {
  trustHost: true,
  // Re-auth on expiry: the session lifetime tracks the token; when it lapses the
  // user is sent through /auth again. No refresh tokens are requested or stored.
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  pages: { signIn: "/login" },
  providers: [
    {
      id: "autox",
      name: "AutoX ID",
      type: "oidc",
      issuer: ISSUER,
      clientId: process.env.AUTOX_CLIENT_ID,
      clientSecret: process.env.AUTOX_CLIENT_SECRET,
      // `resource` (authorize + token) makes the access token a JWT carrying `autox:app_roles`.
      authorization: { params: { scope: SCOPE, resource: API_RESOURCE } },
      checks: ["pkce", "state", "nonce"],
      [customFetch]: fetchWithResource,
    },
  ],
  callbacks: {
    // Pure + edge-safe: project the JWT claims onto the client session so both
    // middleware (req.auth) and server components see `role`, `orgs`, etc.
    // Mutate in place and return the original session (keeps `expires`).
    session({ session, token }) {
      applyTokenToSession(session as unknown as AppSession, token as TokenClaims);
      return session;
    },
  },
} satisfies NextAuthConfig;
