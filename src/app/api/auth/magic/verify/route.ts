import { NextRequest, NextResponse } from "next/server";
import { verifyPurposeToken, signToken, sessionCookie } from "@/lib/auth";
import { getUserByEmail, setLastLogin } from "@/lib/users.queries";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const loginUrl = new URL("/login?error=link", req.url);

  const verified = token ? await verifyPurposeToken(token, "magic") : null;
  if (!verified) return NextResponse.redirect(loginUrl);

  let user;
  try {
    user = await getUserByEmail(verified.email);
  } catch {
    return NextResponse.redirect(loginUrl);
  }
  if (!user || user.status !== "active") return NextResponse.redirect(loginUrl);

  const jwt = await signToken({ sub: user.id, email: user.email, name: user.name, role: user.role });
  const res = NextResponse.redirect(new URL("/overview", req.url));
  res.cookies.set(sessionCookie(jwt));
  await setLastLogin(user.id).catch(() => {});
  return res;
}
