import NextAuth from "next-auth";
import { decodeJwt } from "jose";
import { authConfig } from "@/auth.config";
import { applyProfileToToken } from "@/lib/auth-callbacks";
import { provisionUser } from "@/lib/users.queries";
import type { SsoClaims } from "@/lib/authz";

/** Decode a received JWT's claims without verification (token came from the SSO over TLS). */
function safeDecodeClaims(jwt?: string): SsoClaims | null {
  if (!jwt) return null;
  try {
    return decodeJwt(jwt) as unknown as SsoClaims;
  } catch {
    return null; // opaque token or malformed — ignore
  }
}

/**
 * Node-runtime Auth.js instance. Extends the edge-safe base with the `jwt`
 * callback, which maps ID-token claims onto the JWT and provisions the local
 * user record. Only this module (never the middleware) touches the database.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, account, profile }) {
      // `account` + `profile` are present only at sign-in. On later calls the
      // token is returned unchanged (re-auth on expiry; no refresh).
      if (account && profile) {
        const claims = profile as SsoClaims;
        // Roles may be in the ID token (autox:roles) or the JWT access token
        // (autox:app_roles). Decode both and let role derivation read all sources.
        const idClaims = safeDecodeClaims(account.id_token as string | undefined);
        const accessClaims = safeDecodeClaims(account.access_token as string | undefined);
        const next = applyProfileToToken(token, claims, account, [claims, idClaims, accessClaims]);

        // Provision AFTER authentication, keyed by the stable `sub` — never a gate.
        try {
          if (next.sub) {
            await provisionUser({
              sub: next.sub,
              email: next.email ?? "",
              name: next.name ?? "",
              emailVerified: Boolean(claims.email_verified),
              orgType: next.orgType,
              isEyEmployee: next.isEyEmployee,
            });
          }
        } catch {
          // Best-effort: authentication must not fail if the DB is unavailable.
        }
        return next;
      }
      return token;
    },
  },
});
