import { type DefaultSession } from "next-auth";
import type { Role } from "@/lib/authz";

/**
 * Module augmentation for Auth.js. Adds the AutoX ID claims we carry on the
 * session and the JWT. The `idToken` lives ONLY on the JWT (encrypted server
 * cookie) for RP-initiated logout — it is never surfaced on the Session.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      role?: Role;
    } & DefaultSession["user"];
    roles?: string[];
    orgs?: unknown[];
    isEyEmployee?: boolean;
    orgType?: string;
  }

  interface User {
    role?: Role;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role;
    roles?: string[];
    orgs?: unknown[];
    isEyEmployee?: boolean;
    orgType?: string;
    /** ID token — retained for logout; never copied into the client session. */
    idToken?: string;
  }
}
