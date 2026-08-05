import "server-only";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { auth } from "@/auth";
import { getIntegrations } from "@/lib/integrations.queries";
import { Card, CardTitle, statusColor } from "@/components/ey/ui";
import UsersPanel from "./users-panel";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await auth();
  // Settings is an admin-only surface (user management, integrations).
  if (session?.user?.role !== "admin") redirect("/overview");

  let integrations: Awaited<ReturnType<typeof getIntegrations>> = [];
  try { integrations = await getIntegrations(); } catch { integrations = []; }

  const connected = integrations.filter((i) => i.status === "Active");
  const counts = {
    total: integrations.length,
    active: connected.length,
    error: integrations.filter((i) => i.status === "Error").length,
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Integrations summary (real) */}
      <Card className="p-6">
        <CardTitle
          title="Integrations & connectors"
          sub={`${counts.active} active · ${counts.total} available${counts.error ? ` · ${counts.error} error` : ""}`}
          action={<Link href="/integrations" className="text-[12px] font-bold text-ink" style={{ borderBottom: "2px solid #FFE600", paddingBottom: 1 }}>Manage</Link>}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {(connected.length ? connected : integrations).slice(0, 9).map((c) => (
            <div key={c.id} className="flex items-center gap-3.5 border border-bd p-4">
              <div className="flex h-9 w-9 flex-none items-center justify-center text-[12px] font-bold" style={{ background: "var(--surface)", border: "1px solid var(--bd)", color: "var(--ink2)" }}>
                {c.displayName.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[14px] font-bold text-ink">{c.displayName}</span>
                <span className="truncate text-[11px] text-muted">{c.type}</span>
              </div>
              <span className="inline-flex flex-none items-center gap-2 whitespace-nowrap text-[12px] font-bold text-ink2">
                <span className="h-[9px] w-[9px]" style={{ background: statusColor(c.status) }} />
                {c.status}
              </span>
            </div>
          ))}
          {integrations.length === 0 && <div className="text-[13px] text-muted">No integrations found.</div>}
        </div>
      </Card>

      {/* Provisioned users (read-only — identity & access managed in AutoX ID) */}
      <UsersPanel />
    </div>
  );
}
