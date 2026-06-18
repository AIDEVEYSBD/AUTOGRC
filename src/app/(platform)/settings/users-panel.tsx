"use client";

import { useCallback, useEffect, useState } from "react";

type User = {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  last_login_at?: string | null;
};

const ROLES = [
  { value: "admin", label: "Administrator" },
  { value: "compliance_lead", label: "Compliance lead" },
  { value: "assessor", label: "Assessor" },
  { value: "viewer", label: "Viewer" },
];

function initials(name: string, email: string) {
  const base = name?.trim() || email;
  const parts = base.split(/[\s@.]+/).filter(Boolean);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
}

function statusColor(s: string) {
  return s === "active" ? "var(--st-pass)" : s === "invited" ? "var(--st-warn)" : "var(--muted)";
}

export default function UsersPanel({ canManage }: { canManage: boolean }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("viewer");
  const [busy, setBusy] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);

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

  useEffect(() => { load(); }, [load]);

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setInviteLink("");
    setNote("");
    try {
      const res = await fetch("/api/auth/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, role }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setInviteLink(data.link || "");
        setNote(
          data.emailed
            ? `Invitation emailed to ${email}.`
            : data.emailError
              ? `Email not sent (${data.emailError}). Copy the link below to share.`
              : "Invitation created — copy the link below to share."
        );
        setEmail(""); setName(""); setRole("viewer");
        load();
      } else {
        setNote(data.error || "Could not send invite.");
      }
    } catch {
      setNote("Could not send invite.");
    } finally {
      setBusy(false);
    }
  }

  async function patch(id: string, body: Record<string, string>) {
    await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
    load();
  }

  return (
    <div className="bg-card border border-bd" style={{ gridColumn: "1 / -1" }}>
      <div className="flex items-center justify-between border-b border-bd px-6 py-5">
        <span className="text-[14px] font-bold text-ink" style={{ letterSpacing: "-0.02em" }}>Users &amp; roles</span>
        {canManage && (
          <button
            onClick={() => setInviteOpen((v) => !v)}
            className="px-4 py-2.5 text-[12px] font-bold"
            style={{ background: inviteOpen ? "#1A1A24" : "transparent", color: inviteOpen ? "#FFE600" : "var(--ink)", border: "1px solid var(--ink)" }}
          >
            {inviteOpen ? "Close" : "Invite user"}
          </button>
        )}
      </div>

      {canManage && inviteOpen && (
        <form onSubmit={sendInvite} className="flex flex-col gap-3 border-b border-bd bg-surface px-6 py-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_2fr_1.2fr_auto]">
            <input required type="email" placeholder="email@company.com" value={email} onChange={(e) => setEmail(e.target.value)}
              className="px-3 py-2.5 text-[13px] outline-none" style={{ border: "1px solid var(--bd)", background: "var(--card)", color: "var(--ink)" }} />
            <input placeholder="Full name (optional)" value={name} onChange={(e) => setName(e.target.value)}
              className="px-3 py-2.5 text-[13px] outline-none" style={{ border: "1px solid var(--bd)", background: "var(--card)", color: "var(--ink)" }} />
            <select value={role} onChange={(e) => setRole(e.target.value)}
              className="px-3 py-2.5 text-[13px] outline-none" style={{ border: "1px solid var(--bd)", background: "var(--card)", color: "var(--ink)" }}>
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <button type="submit" disabled={busy} className="px-4 py-2.5 text-[13px] font-bold disabled:opacity-60"
              style={{ background: "#FFE600", color: "#1A1A24", border: 0 }}>
              {busy ? "Sending…" : "Send invite"}
            </button>
          </div>
          {inviteLink && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center" style={{ background: "var(--card)", border: "1px solid var(--bd)", padding: 12 }}>
              <code className="min-w-0 flex-1 truncate text-[12px] text-ink">{inviteLink}</code>
              <button type="button" onClick={() => { navigator.clipboard?.writeText(inviteLink); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                className="px-3 py-2 text-[12px] font-bold" style={{ border: "1px solid var(--ink)", color: "var(--ink)" }}>
                {copied ? "Copied!" : "Copy link"}
              </button>
            </div>
          )}
        </form>
      )}

      {note && <div className="px-6 py-3 text-[12px] text-muted">{note}</div>}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="bg-surface">
              {["User", "Email", "Role", "Status", ""].map((h) => (
                <th key={h} className="px-6 py-3 text-left text-[11px] font-bold text-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="px-6 py-6 text-[13px] text-muted">Loading…</td></tr>}
            {!loading && users.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-6 text-[13px] text-muted">No users yet. {canManage ? "Invite your first teammate." : ""}</td></tr>
            )}
            {users.map((u) => (
              <tr key={u.id} className="border-t border-hair">
                <td className="px-6 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 flex-none items-center justify-center text-[12px] font-bold" style={{ background: "#1A1A24", color: "#fff" }}>{initials(u.name, u.email)}</div>
                    <span className="text-[14px] font-bold text-ink">{u.name || "—"}</span>
                  </div>
                </td>
                <td className="px-6 py-3.5 text-[13px] text-ink2">{u.email}</td>
                <td className="px-6 py-3.5">
                  {canManage ? (
                    <select value={u.role} onChange={(e) => patch(u.id, { role: e.target.value })}
                      className="px-2.5 py-1.5 text-[12px] font-bold outline-none" style={{ border: "1px solid var(--bd)", background: "var(--card)", color: "var(--ink2)" }}>
                      {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  ) : (
                    <span className="text-[12px] font-bold text-ink2">{ROLES.find((r) => r.value === u.role)?.label || u.role}</span>
                  )}
                </td>
                <td className="px-6 py-3.5">
                  <span className="inline-flex items-center gap-2 text-[12px] font-bold text-ink2">
                    <span className="h-[9px] w-[9px]" style={{ background: statusColor(u.status) }} />
                    {u.status}
                  </span>
                </td>
                <td className="px-6 py-3.5 text-right">
                  {canManage && u.status !== "invited" && (
                    <button onClick={() => patch(u.id, { status: u.status === "active" ? "disabled" : "active" })}
                      className="text-[12px] font-bold" style={{ color: u.status === "active" ? "var(--st-fail)" : "var(--st-pass)" }}>
                      {u.status === "active" ? "Disable" : "Enable"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
