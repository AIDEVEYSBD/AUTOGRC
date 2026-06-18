import { NextRequest, NextResponse } from "next/server";
import { signPurposeToken } from "@/lib/auth";
import { getUserByEmail } from "@/lib/users.queries";
import { sendEmail, isEmailConfigured, authEmail } from "@/lib/email";

/**
 * Forgot-password. Emails an active/invited user a one-time reset link.
 * Always responds generically to avoid account enumeration.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();

  const generic = { ok: true, message: "If that account exists, a password reset link has been sent." };
  if (!email) return NextResponse.json(generic);

  try {
    const user = await getUserByEmail(email);
    if (user && user.status !== "disabled") {
      const token = await signPurposeToken("reset", user.email);
      const link = `${req.nextUrl.origin}/reset?token=${token}`;
      if (isEmailConfigured()) {
        await sendEmail({
          to: user.email,
          subject: "Reset your AutoGRC password",
          html: authEmail({
            heading: "Reset your password",
            intro: "We received a request to reset your AutoGRC password. Choose a new one using the button below. This link works once and expires in 30 minutes.",
            ctaLabel: "Choose a new password",
            ctaUrl: link,
            note: "If you didn't request this, you can ignore this email — your password stays the same.",
          }),
        });
      } else if (process.env.NODE_ENV !== "production") {
        // Dev fallback only — link is logged server-side, never returned to the client.
        console.log(`[dev] AutoGRC password reset link for ${user.email}: ${link}`);
      }
    }
  } catch {
    // swallow — respond generically
  }

  // SECURITY: never return the link in the response. Email/console delivery only.
  return NextResponse.json(generic);
}
