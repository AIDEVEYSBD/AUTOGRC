"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { probeSsoHealth } from "@/lib/sso";

/**
 * "Continue with AutoX ID" button.
 *
 * AutoX ID is a scale-to-zero deployment, so we probe its `/health` endpoint
 * (guide → "Cold Start Handling") before kicking off the OIDC redirect — this
 * avoids bouncing the user to a cold, not-yet-ready authorize endpoint. Auth.js
 * then handles PKCE + state + nonce and redirects to `/auth`.
 */
export default function SsoSignInButton({ redirectTo = "/overview" }: { redirectTo?: string }) {
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");

  async function handleClick() {
    setLoading(true);
    setNote("Connecting to AutoX ID…");
    try {
      const healthy = await probeSsoHealth({ timeoutMs: 60_000 });
      if (!healthy) setNote("AutoX ID is waking up — continuing anyway…");
      await signIn("autox", { redirectTo });
      // On success the browser navigates away; nothing after this runs.
    } catch {
      setNote("Could not start sign-in. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="flex items-center justify-center gap-2.5 p-3.5 text-[15px] font-bold disabled:opacity-60"
        style={{
          background: "#FFE600",
          color: "#1A1A24",
          border: 0,
          cursor: loading ? "not-allowed" : "pointer",
          letterSpacing: "-0.02em",
        }}
      >
        {loading ? "Redirecting…" : "Continue with AutoX ID"}
        {!loading && (
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8">
            <line x1="2" y1="9" x2="15" y2="9" />
            <path d="M10 4 L15 9 L10 14" />
          </svg>
        )}
      </button>
      {note && (
        <p className="mt-3 text-[12px]" style={{ color: "#747480", letterSpacing: "-0.01em" }}>
          {note}
        </p>
      )}
    </div>
  );
}
