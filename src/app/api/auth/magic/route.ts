import { NextRequest, NextResponse } from "next/server";
import { signPurposeToken } from "@/lib/auth";
import { getUserByEmail } from "@/lib/users.queries";
import { sendEmail, isEmailConfigured, authEmail } from "@/lib/email";

/**
 * Passwordless sign-in. Emails an active user a one-time link.
 * Always responds generically to avoid account enumeration.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();

  const generic = { ok: true, message: "If that account exists, a sign-in link has been sent." };
  if (!email) return NextResponse.json(generic);

  try {
    const user = await getUserByEmail(email);
    if (user && user.status === "active") {
      const token = await signPurposeToken("magic", user.email);
      const link = `${req.nextUrl.origin}/api/auth/magic/verify?token=${token}`;
      if (isEmailConfigured()) {
        await sendEmail({
          to: user.email,
          subject: "Your AutoGRC sign-in link",
          html: authEmail({
            heading: "Sign in to AutoGRC",
            intro: "Use the button below to sign in. This link works once and expires in 30 minutes.",
            ctaLabel: "Sign in",
            ctaUrl: link,
            note: "If you didn't request this, you can ignore this email.",
          }),
        });
      } else if (process.env.NODE_ENV !== "production") {
        // Dev fallback only — link is logged server-side, never returned to the client.
        console.log(`[dev] AutoGRC sign-in link for ${user.email}: ${link}`);
      }
    }
  } catch {
    // swallow — respond generically
  }

  // SECURITY: never return the link in the response. Email/console delivery only.
  return NextResponse.json(generic);
}
