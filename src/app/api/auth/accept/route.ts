import { NextRequest, NextResponse } from "next/server";
import { signToken, sessionCookie } from "@/lib/auth";
import { acceptInvitation } from "@/lib/users.queries";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const token = String(body.token ?? "");
  const name = String(body.name ?? "").trim();
  const password = String(body.password ?? "");

  if (!token || !name || !password) {
    return NextResponse.json({ error: "Name and password are required." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  let claims;
  try {
    claims = await acceptInvitation(token, name, password);
  } catch {
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
  if (!claims) {
    return NextResponse.json({ error: "This invite link is invalid or has expired." }, { status: 400 });
  }

  const jwt = await signToken(claims);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(sessionCookie(jwt));
  return res;
}
