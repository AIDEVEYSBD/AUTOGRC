import { describe, it, expect } from "vitest";
import { roleFromClaims, can, APP_PERMISSIONS, ROLE_PRECEDENCE, isAdmin, type SsoClaims } from "@/lib/authz";

describe("roleFromClaims", () => {
  it("returns viewer for null / undefined / empty claims", () => {
    expect(roleFromClaims(null)).toBe("viewer");
    expect(roleFromClaims(undefined)).toBe("viewer");
    expect(roleFromClaims({})).toBe("viewer");
    expect(roleFromClaims({ "autox:roles": [] })).toBe("viewer");
  });

  it("maps a single known directory role", () => {
    expect(roleFromClaims({ "autox:roles": ["viewer"] })).toBe("viewer");
    expect(roleFromClaims({ "autox:roles": ["assessor"] })).toBe("assessor");
    expect(roleFromClaims({ "autox:roles": ["compliance_lead"] })).toBe("compliance_lead");
    expect(roleFromClaims({ "autox:roles": ["admin"] })).toBe("admin");
  });

  it("returns the highest-privilege role when several are present", () => {
    expect(roleFromClaims({ "autox:roles": ["viewer", "admin", "assessor"] })).toBe("admin");
    expect(roleFromClaims({ "autox:roles": ["viewer", "assessor"] })).toBe("assessor");
    expect(roleFromClaims({ "autox:roles": ["assessor", "compliance_lead"] })).toBe("compliance_lead");
  });

  it("reads app_roles as well as directory roles (union)", () => {
    expect(roleFromClaims({ "autox:app_roles": ["admin"], "autox:roles": ["viewer"] })).toBe("admin");
    expect(roleFromClaims({ "autox:app_roles": ["assessor"] })).toBe("assessor");
  });

  it("ignores unknown roles and falls back to viewer", () => {
    expect(roleFromClaims({ "autox:roles": ["superuser", "root"] })).toBe("viewer");
    expect(roleFromClaims({ "autox:roles": ["superuser", "assessor"] })).toBe("assessor");
  });

  it("coerces non-string role entries safely", () => {
    const claims = { "autox:roles": [123 as unknown as string, "admin"] } as SsoClaims;
    expect(roleFromClaims(claims)).toBe("admin");
  });

  it("keeps precedence admin > compliance_lead > assessor > viewer", () => {
    expect(ROLE_PRECEDENCE).toEqual(["admin", "compliance_lead", "assessor", "viewer"]);
  });
});

describe("can / APP_PERMISSIONS", () => {
  it("admin can do everything", () => {
    for (const p of ["read", "write", "manage_integrations", "manage_users", "admin"] as const) {
      expect(can("admin", p)).toBe(true);
    }
  });

  it("viewer is read-only", () => {
    expect(can("viewer", "read")).toBe(true);
    expect(can("viewer", "write")).toBe(false);
    expect(can("viewer", "manage_integrations")).toBe(false);
    expect(can("viewer", "admin")).toBe(false);
  });

  it("assessor can read/write but not manage", () => {
    expect(can("assessor", "read")).toBe(true);
    expect(can("assessor", "write")).toBe(true);
    expect(can("assessor", "manage_integrations")).toBe(false);
    expect(can("assessor", "manage_users")).toBe(false);
  });

  it("compliance_lead can manage integrations but not users", () => {
    expect(can("compliance_lead", "write")).toBe(true);
    expect(can("compliance_lead", "manage_integrations")).toBe(true);
    expect(can("compliance_lead", "manage_users")).toBe(false);
  });

  it("returns false for an undefined/null role", () => {
    expect(can(undefined, "read")).toBe(false);
    expect(can(null, "read")).toBe(false);
  });

  it("every role grants read", () => {
    for (const role of ROLE_PRECEDENCE) {
      expect(APP_PERMISSIONS[role].has("read")).toBe(true);
    }
  });
});

describe("isAdmin", () => {
  it("is true only for admin", () => {
    expect(isAdmin("admin")).toBe(true);
    expect(isAdmin("compliance_lead")).toBe(false);
    expect(isAdmin(undefined)).toBe(false);
  });
});
