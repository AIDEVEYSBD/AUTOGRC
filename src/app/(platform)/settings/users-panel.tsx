"use client";

import { useCallback, useEffect, useState } from "react";

type ProvisionedUser = {
  sub: string;
  email: string;
  name: string;
  org_type: string | null;
  is_ey_employee: boolean | null;
  created_at?: string;
  last_login_at?: string | null;
};

function initials(name: string, email: string) {
  const base = name?.trim() || email;
  const parts = base.split(/[\s@.]+/).filter(Boolean);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
}

function formatWhen(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/**
 * Read-only view of locally provisioned users. Identity and roles are managed in
 * AutoX ID (the SSO) — this panel only reflects who has signed in. There are no
 * invite / role / status controls here by design.
 */
export default function UsersPanel() {
  const [users, setUsers] = useState<ProvisionedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      const data = await res.json().catch(() => ({}));
      setUsers(data.users || []);
      if (data.error) setNote(data.error);
    } catch {
      setNote("Could not load users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="bg-card border border-bd" style={{ gridColumn: "1 / -1" }}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-bd px-6 py-5">
        <span className="text-[14px] font-bold text-ink" style={{ letterSpacing: "-0.02em" }}>Users &amp; access</span>
        <span
          className="inline-flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold"
          style={{ background: "var(--surface)", border: "1px solid var(--bd)", color: "var(--ink2)" }}
        >
          <span className="h-[8px] w-[8px]" style={{ background: "#FFE600" }} />
          Managed in AutoX ID
        </span>
      </div>

      <div className="px-6 py-3 text-[12px] text-muted">
        Sign-in, roles and de-provisioning are handled centrally in AutoX ID. This list reflects users
        who have signed in to AutoGRC. To change someone&apos;s role, update it in the AutoX ID admin board.
      </div>

      {note && <div className="px-6 pb-3 text-[12px] text-muted">{note}</div>}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="bg-surface">
              {["User", "Email", "Organization", "Last sign-in"].map((h) => (
                <th key={h} className="px-6 py-3 text-left text-[11px] font-bold text-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={4} className="px-6 py-6 text-[13px] text-muted">Loading…</td></tr>
            )}
            {!loading && users.length === 0 && (
              <tr><td colSpan={4} className="px-6 py-6 text-[13px] text-muted">No users have signed in yet.</td></tr>
            )}
            {users.map((u) => (
              <tr key={u.sub} className="border-t border-hair">
                <td className="px-6 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 flex-none items-center justify-center text-[12px] font-bold" style={{ background: "#1A1A24", color: "#fff" }}>{initials(u.name, u.email)}</div>
                    <span className="text-[14px] font-bold text-ink">{u.name || "—"}</span>
                  </div>
                </td>
                <td className="px-6 py-3.5 text-[13px] text-ink2">{u.email}</td>
                <td className="px-6 py-3.5">
                  <span className="inline-flex items-center gap-2 text-[12px] font-bold text-ink2">
                    {u.org_type || "—"}
                    {u.is_ey_employee ? (
                      <span className="px-1.5 py-0.5 text-[9px] font-bold" style={{ background: "#3A3A46", color: "#FFE600" }}>EY</span>
                    ) : null}
                  </span>
                </td>
                <td className="px-6 py-3.5 text-[13px] text-ink2">{formatWhen(u.last_login_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
