import { NextRequest, NextResponse } from "next/server";
import {
  signToken,
  sessionCookie,
  verifyPassword,
  legacyCredentialsValid,
} from "@/lib/auth";
import { getUserByEmail, setLastLogin } from "@/lib/users.queries";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  // Accept `email` (new) or `username` (legacy clients)
  const identifier = String(body.email ?? body.username ?? "").trim();
  const password = String(body.password ?? "");

  if (!identifier || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  // 1. DB-backed user (may throw if migration hasn't run — fall through to legacy)
  try {
    const user = await getUserByEmail(identifier);
    if (user) {
      if (user.status === "disabled") {
        return NextResponse.json({ error: "This account has been disabled." }, { status: 403 });
      }
      if (user.status === "invited" || !user.password_hash) {
        return NextResponse.json(
          { error: "Finish setting up your account using your invite link." },
          { status: 401 }
        );
      }
      if (!verifyPassword(password, user.password_hash)) {
        return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
      }
      const token = await signToken({ sub: user.id, email: user.email, name: user.name, role: user.role });
      await setLastLogin(user.id).catch(() => {});
      const res = NextResponse.json({ ok: true });
      res.cookies.set(sessionCookie(token));
      return res;
    }
  } catch {
    // table missing / DB unavailable — legacy fallback below
  }

  // 2. Legacy single-credential bootstrap (works before/without migration)
  if (legacyCredentialsValid(identifier, password)) {
    const token = await signToken({
      sub: "legacy-admin",
      email: "sbd@autogrc.local",
      name: "SBD Admin",
      role: "admin",
    });
    const res = NextResponse.json({ ok: true });
    res.cookies.set(sessionCookie(token));
    return res;
  }

  return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
}
