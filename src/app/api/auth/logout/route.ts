import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { buildEndSessionUrl } from "@/lib/sso";

// Reads the encrypted session cookie to recover the ID token, so must run on Node.
export const runtime = "nodejs";

const SECURE = process.env.NODE_ENV === "production";
const COOKIE_NAME = SECURE ? "__Secure-authjs.session-token" : "authjs.session-token";

// Every cookie variant Auth.js might have set for the JWT session (base + chunks).
const COOKIE_VARIANTS = ["authjs.session-token", "__Secure-authjs.session-token"].flatMap((b) => [
  b,
  `${b}.0`,
  `${b}.1`,
]);

function clearSessionCookies(res: NextResponse) {
  for (const name of COOKIE_VARIANTS) {
    res.cookies.set(name, "", { path: "/", maxAge: 0 });
  }
}

/**
 * RP-initiated logout (guide → "Logout Implementation").
 *
 * Reads the ID token from the encrypted httpOnly session cookie server-side
 * (never exposing it to JS), then top-level redirects the browser to the SSO
 * `end_session_endpoint` with the mandatory `id_token_hint`. AutoX ID clears its
 * session and redirects back to the registered post-logout URI (`/`). The local
 * session cookies are expired on the way out.
 *
 * A GET handler so it can be reached via a plain top-level navigation
 * (`window.location.href = "/api/auth/logout"`).
 */
export async function GET(req: NextRequest) {
  const origin = new URL(req.url).origin;
  const postLogoutRedirectUri = `${origin}/`;

  let idToken: string | undefined;
  try {
    const token = await getToken({
      req,
      secret: process.env.AUTH_SECRET,
      secureCookie: SECURE,
      cookieName: COOKIE_NAME,
      salt: COOKIE_NAME,
    });
    idToken = (token as { idToken?: string } | null)?.idToken;
  } catch {
    idToken = undefined;
  }

  // Without an id_token_hint the SSO cannot validate the redirect and won't come
  // back — in that case just clear the local session and land on home.
  const target = idToken
    ? buildEndSessionUrl({ idToken, postLogoutRedirectUri })
    : postLogoutRedirectUri;

  const res = NextResponse.redirect(target);
  clearSessionCookies(res);
  return res;
}
