import { Metadata } from "next";
import SsoSignInButton from "@/components/auth/SsoSignInButton";

export const metadata: Metadata = { title: "Sign in" };

/** Friendly copy for the error codes Auth.js appends to the sign-in page. */
function errorMessage(code?: string): string | null {
  if (!code) return null;
  switch (code) {
    case "AccessDenied":
      return "You don't have access to AutoGRC. Ask an administrator to grant you a role in AutoX ID.";
    case "Configuration":
      return "Sign-in is temporarily misconfigured. Please contact your administrator.";
    case "Verification":
      return "That sign-in link is no longer valid. Please try again.";
    default:
      return "Sign-in failed. Please try again.";
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const { error, callbackUrl } = await searchParams;
  const redirectTo = typeof callbackUrl === "string" && callbackUrl.startsWith("/") ? callbackUrl : "/overview";
  const errText = errorMessage(error);

  return (
    <div className="flex min-h-screen" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
      {/* Brand panel */}
      <div
        className="relative hidden flex-1 flex-col justify-between p-10 text-white md:flex lg:p-16"
        style={{ background: "#1A1A24" }}
      >
        <div className="absolute left-16 top-0 h-[5px] w-40" style={{ background: "linear-gradient(90deg,#FFE600,#FF32FF,#32FFFF)" }} />
        <div className="flex items-center gap-3">
          <div className="flex flex-col leading-tight">
            <span className="text-[15px] font-bold" style={{ letterSpacing: "-0.02em" }}>AutoGRC</span>
            <span className="text-[11px]" style={{ color: "#9A9AA6" }}>Automated assurance platform</span>
          </div>
        </div>
        <div className="max-w-[560px]">
          <h2 className="m-0 mb-5 text-[40px] font-bold leading-[1.05] lg:text-[52px]" style={{ letterSpacing: "-0.03em" }}>
            How do you prove compliance the moment someone asks?
          </h2>
          <p className="m-0 max-w-[480px] text-[18px] leading-[1.5]" style={{ color: "#C4C4CD", letterSpacing: "-0.01em" }}>
            Map controls to every framework, test them continuously, and generate audit-ready evidence in minutes — not weeks.
          </p>
        </div>
        <div className="flex items-end justify-between gap-6">
          <p className="m-0 text-[13px] leading-[1.5]" style={{ letterSpacing: "-0.01em" }}>
            The better the question. The better the answer.<br />The better the world works.
          </p>
          <div className="flex gap-[5px]">
            <span className="h-[14px] w-[14px]" style={{ background: "#FFE600" }} />
            <span className="h-[14px] w-[14px]" style={{ background: "#5A5A66" }} />
            <span className="h-[14px] w-[14px]" style={{ background: "#5A5A66" }} />
          </div>
        </div>
      </div>

      {/* Sign-in panel */}
      <div className="flex w-full flex-col justify-center gap-1.5 bg-white px-6 py-12 sm:px-14 md:w-[480px] md:flex-none">
        {/* Mobile brand */}
        <div className="mb-4 flex items-center gap-3 md:hidden">
          <span className="text-[18px] font-bold" style={{ color: "#1A1A24", letterSpacing: "-0.02em" }}>AutoGRC</span>
        </div>

        <h3 className="m-0 text-[30px] font-bold" style={{ color: "#1A1A24", letterSpacing: "-0.03em" }}>Sign in</h3>
        <p className="m-0 mb-6 text-[14px]" style={{ color: "#747480", letterSpacing: "-0.01em" }}>
          Access your compliance workspace with your organization account.
        </p>

        {errText && (
          <p className="mb-4 px-3 py-2.5 text-[13px]" style={{ background: "rgba(255,65,54,0.1)", color: "#C32A1F" }}>
            {errText}
          </p>
        )}

        <SsoSignInButton redirectTo={redirectTo} />

        <p className="mt-6 text-[12px] leading-[1.6]" style={{ color: "#747480", letterSpacing: "-0.01em" }}>
          You'll be redirected to AutoX ID to sign in securely. Access and roles are managed there.
        </p>

        <p className="mt-8 text-[11px]" style={{ color: "#C4C4CD", letterSpacing: "-0.01em" }}>
          Internal demonstration build. No client data.
        </p>
      </div>
    </div>
  );
}
