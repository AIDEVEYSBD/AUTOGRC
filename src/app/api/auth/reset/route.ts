import { NextRequest, NextResponse } from "next/server";
import { verifyPurposeToken, signToken, sessionCookie } from "@/lib/auth";
import { setUserPassword } from "@/lib/users.queries";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const token = String(body.token ?? "");
  const password = String(body.password ?? "");

  if (!token || !password) {
    return NextResponse.json({ error: "A new password is required." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const verified = await verifyPurposeToken(token, "reset");
  if (!verified) {
    return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
  }

  let claims;
  try {
    claims = await setUserPassword(verified.email, password);
  } catch {
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
  if (!claims) {
    return NextResponse.json({ error: "Could not reset the password for this account." }, { status: 400 });
  }

  const jwt = await signToken(claims);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(sessionCookie(jwt));
  return res;
}
