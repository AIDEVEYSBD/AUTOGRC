import { describe, it, expect } from "vitest";
import { ISSUER, SSO_ENDPOINTS, SCOPE, buildEndSessionUrl, probeSsoHealth } from "@/lib/sso";

describe("SSO constants", () => {
  it("uses the AutoX issuer and derived endpoints", () => {
    expect(ISSUER).toBe("https://sso.autogrc.cloud");
    expect(SSO_ENDPOINTS.authorization).toBe("https://sso.autogrc.cloud/auth");
    expect(SSO_ENDPOINTS.token).toBe("https://sso.autogrc.cloud/token");
    expect(SSO_ENDPOINTS.userinfo).toBe("https://sso.autogrc.cloud/me");
    expect(SSO_ENDPOINTS.jwks).toBe("https://sso.autogrc.cloud/jwks");
    expect(SSO_ENDPOINTS.endSession).toBe("https://sso.autogrc.cloud/session/end");
    expect(SSO_ENDPOINTS.health).toBe("https://sso.autogrc.cloud/health");
  });

  it("requests the guide's standard scopes without offline_access", () => {
    expect(SCOPE).toBe("openid profile email orgs roles");
    expect(SCOPE).not.toContain("offline_access");
  });
});

describe("buildEndSessionUrl", () => {
  it("includes id_token_hint, encoded post_logout_redirect_uri and state", () => {
    const url = buildEndSessionUrl({
      idToken: "ID.T.OKEN",
      postLogoutRedirectUri: "https://app.example.com/",
      state: "xyz",
    });
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe("https://sso.autogrc.cloud/session/end");
    expect(parsed.searchParams.get("id_token_hint")).toBe("ID.T.OKEN");
    expect(parsed.searchParams.get("post_logout_redirect_uri")).toBe("https://app.example.com/");
    expect(parsed.searchParams.get("state")).toBe("xyz");
    // the redirect URI must be percent-encoded in the raw query string
    expect(url).toContain("post_logout_redirect_uri=https%3A%2F%2Fapp.example.com%2F");
  });

  it("omits id_token_hint and state when not provided", () => {
    const url = buildEndSessionUrl({ postLogoutRedirectUri: "https://app.example.com/" });
    const parsed = new URL(url);
    expect(parsed.searchParams.has("id_token_hint")).toBe(false);
    expect(parsed.searchParams.has("state")).toBe(false);
    expect(parsed.searchParams.get("post_logout_redirect_uri")).toBe("https://app.example.com/");
  });
});

describe("probeSsoHealth", () => {
  const okResp = { ok: true, json: async () => ({ status: "ok" }) };
  const wakingResp = { ok: true, json: async () => ({ status: "starting" }) };

  it("resolves true as soon as /health reports ok", async () => {
    let calls = 0;
    const fetchImpl = async () => {
      calls++;
      return okResp;
    };
    const result = await probeSsoHealth({ fetchImpl, now: () => 0, sleep: async () => {} });
    expect(result).toBe(true);
    expect(calls).toBe(1);
  });

  it("returns false once the deadline passes", async () => {
    const times = [0, 100_000];
    let idx = 0;
    const now = () => times[Math.min(idx, times.length - 1)];
    const fetchImpl = async () => {
      idx++;
      return wakingResp;
    };
    const result = await probeSsoHealth({ fetchImpl, timeoutMs: 60_000, now, sleep: async () => {} });
    expect(result).toBe(false);
  });

  it("keeps retrying through fetch rejections, then succeeds", async () => {
    let calls = 0;
    let clock = 0;
    const fetchImpl = async () => {
      calls++;
      if (calls < 3) throw new Error("connection refused");
      return okResp;
    };
    const result = await probeSsoHealth({
      fetchImpl,
      now: () => clock,
      sleep: async (ms) => {
        clock += ms;
      },
      intervalMs: 2_000,
      timeoutMs: 60_000,
    });
    expect(result).toBe(true);
    expect(calls).toBe(3);
  });
});
