import { describe, it, expect } from "vitest";
import { applyProfileToToken, applyTokenToSession, type TokenClaims } from "@/lib/auth-callbacks";
import type { SsoClaims } from "@/lib/authz";

const profile: SsoClaims = {
  sub: "user-123",
  email: "jordan@ey.com",
  email_verified: true,
  name: "Jordan Lee",
  preferred_username: "jlee",
  "autox:is_ey_employee": true,
  "autox:org_type": "EY",
  "autox:orgs": [{ id: "o1", name: "EY", type: "EY", role: "admin" }],
  "autox:roles": ["assessor", "admin"],
};

describe("applyProfileToToken", () => {
  it("maps identity, roles, orgs and id_token into the token", () => {
    const token = applyProfileToToken({}, profile, { id_token: "ID.TOKEN" });
    expect(token.sub).toBe("user-123");
    expect(token.email).toBe("jordan@ey.com");
    expect(token.name).toBe("Jordan Lee");
    expect(token.role).toBe("admin"); // highest of [assessor, admin]
    expect(token.roles).toContain("admin");
    expect(token.roles).toContain("assessor");
    expect(token.orgs).toHaveLength(1);
    expect(token.isEyEmployee).toBe(true);
    expect(token.orgType).toBe("EY");
    expect(token.idToken).toBe("ID.TOKEN");
  });

  it("derives role from claims, never from a pre-existing token role", () => {
    const token = applyProfileToToken({ role: "admin" } as TokenClaims, {
      sub: "u2",
      "autox:roles": ["viewer"],
    });
    expect(token.role).toBe("viewer");
  });

  it("falls back to preferred_username when name is absent", () => {
    const token = applyProfileToToken({}, { sub: "u3", preferred_username: "sam" });
    expect(token.name).toBe("sam");
  });

  it("defaults orgs to an empty array and role to viewer with minimal claims", () => {
    const token = applyProfileToToken({}, { sub: "u4" });
    expect(token.orgs).toEqual([]);
    expect(token.role).toBe("viewer");
    expect(token.isEyEmployee).toBe(false);
  });

  it("finds an app role that lives in a separate source (the JWT access token)", () => {
    // ID token only says viewer; the access token carries the admin app role.
    const idToken: SsoClaims = { sub: "u5", "autox:roles": ["viewer"] };
    const accessToken: SsoClaims = { "autox:app_roles": ["admin"] };
    const token = applyProfileToToken({}, idToken, { access_token: "jwt" }, [idToken, accessToken]);
    expect(token.role).toBe("admin");
    expect(token.roles).toContain("admin");
    expect(token.roles).toContain("viewer");
  });

  it("ignores null/undefined role sources", () => {
    const idToken: SsoClaims = { sub: "u6", "autox:app_roles": ["assessor"] };
    const token = applyProfileToToken({}, idToken, null, [idToken, null, undefined]);
    expect(token.role).toBe("assessor");
  });
});

describe("applyTokenToSession", () => {
  const token: TokenClaims = {
    sub: "user-123",
    email: "jordan@ey.com",
    name: "Jordan Lee",
    role: "compliance_lead",
    roles: ["compliance_lead"],
    orgs: [{ id: "o1" }],
    isEyEmployee: true,
    orgType: "EY",
    idToken: "SECRET.ID.TOKEN",
  };

  it("copies identity + role into the client session", () => {
    const session = applyTokenToSession({ user: {} }, token);
    expect(session.user!.id).toBe("user-123");
    expect(session.user!.role).toBe("compliance_lead");
    expect(session.user!.email).toBe("jordan@ey.com");
    expect(session.roles).toEqual(["compliance_lead"]);
    expect(session.orgs).toHaveLength(1);
    expect(session.isEyEmployee).toBe(true);
    expect(session.orgType).toBe("EY");
  });

  it("never leaks the id token into the client session", () => {
    const session = applyTokenToSession({ user: {} }, token);
    expect(JSON.stringify(session)).not.toContain("SECRET.ID.TOKEN");
    expect((session as Record<string, unknown>).idToken).toBeUndefined();
    expect((session.user as Record<string, unknown>).idToken).toBeUndefined();
  });

  it("defaults role to viewer when the token carries none", () => {
    const session = applyTokenToSession({ user: {} }, { sub: "x" });
    expect(session.user!.role).toBe("viewer");
  });
});
