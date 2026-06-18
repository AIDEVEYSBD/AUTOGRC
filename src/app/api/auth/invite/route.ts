import { NextRequest, NextResponse } from "next/server";
import { getSession, type Role } from "@/lib/auth";
import { createInvitation } from "@/lib/users.queries";
import { sendEmail, isEmailConfigured, authEmail } from "@/lib/email";

const ROLES: Role[] = ["admin", "compliance_lead", "assessor", "viewer"];

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Admins only" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const name = String(body.name ?? "").trim();
  const role = (ROLES.includes(body.role) ? body.role : "viewer") as Role;

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  let invite;
  try {
    invite = await createInvitation({ email, name, role, invitedBy: session.email });
  } catch {
    return NextResponse.json(
      { error: "Could not create invite. Has the database migration been run?" },
      { status: 500 }
    );
  }

  const link = `${req.nextUrl.origin}/accept?token=${invite.token}`;

  let emailed = false;
  let emailError: string | undefined;
  if (isEmailConfigured()) {
    const r = await sendEmail({
      to: email,
      subject: "You're invited to AutoGRC",
      html: authEmail({
        heading: "You're invited to AutoGRC",
        intro: "You've been invited to the AutoGRC compliance workspace. Set up your account to get started.",
        ctaLabel: "Set up your account",
        ctaUrl: link,
        note: "This invitation expires in 7 days.",
      }),
    });
    emailed = r.sent;
    if (!r.sent) emailError = r.error;
  }

  // Always return the link so the admin can copy/share it (zero email dependency).
  return NextResponse.json({ ok: true, link, emailed, emailError });
}
