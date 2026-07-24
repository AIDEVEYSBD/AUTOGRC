import type { CSSProperties, ReactNode } from "react";

/* Shared EY primitives (server-safe — no hooks). Use the token utilities
   exposed in globals.css: bg-card, border-bd, text-ink, text-muted, etc. */

const STATUS_HEX: Record<string, string> = {
  Active: "var(--st-pass)", Complete: "var(--st-pass)", Completed: "var(--st-pass)",
  Ready: "var(--st-pass)", Connected: "var(--st-pass)", Compliant: "var(--st-pass)",
  Passed: "var(--st-pass)", Mitigated: "var(--st-pass)", Met: "var(--st-pass)",
  "In progress": "var(--st-info)", Syncing: "var(--st-info)", Running: "var(--st-info)", Started: "var(--st-info)",
  "At risk": "var(--st-fail)", Failed: "var(--st-fail)", "Not Compliant": "var(--st-fail)", Overdue: "var(--st-fail)", Error: "var(--st-fail)",
  Open: "var(--st-warn)", Draft: "var(--st-warn)", Planning: "var(--st-warn)", Partial: "var(--st-warn)", "Partial Gap": "var(--st-warn)",
  "Not started": "var(--muted)", "Not connected": "var(--muted)", Disabled: "var(--muted)", "Not Applicable": "var(--muted)", "Not run": "var(--muted)",
};

export function statusColor(s: string): string {
  return STATUS_HEX[s] ?? "var(--muted)";
}

export function impactColor(level: string): string {
  return { High: "var(--st-fail)", Medium: "var(--st-warn)", Low: "var(--st-pass)" }[level] ?? "var(--muted)";
}

export function Card({ children, className = "", style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={`bg-card border border-bd ${className}`} style={style}>
      {children}
    </div>
  );
}

export function StatusBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap text-[12px] font-bold text-ink2">
      <span className="h-[9px] w-[9px] flex-none" style={{ background: statusColor(label) }} />
      {label}
    </span>
  );
}

export function DemoBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${className}`}
      style={{ background: "rgba(255,129,10,0.12)", color: "var(--st-warn)", border: "1px solid var(--st-warn)" }}
      title="This screen uses placeholder data — no backing table yet"
    >
      <span className="h-1.5 w-1.5" style={{ background: "var(--st-warn)" }} />
      Demo data
    </span>
  );
}

export function Bar({ pct, color = "#1777CF", track = true }: { pct: number; color?: string; track?: boolean }) {
  return (
    <div className="relative h-2 flex-1" style={{ background: track ? "var(--track)" : "transparent" }}>
      <div className="absolute bottom-0 left-0 top-0" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }} />
    </div>
  );
}

export function CardTitle({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div className="flex flex-col gap-1">
        <span className="text-[14px] font-bold text-ink" style={{ letterSpacing: "-0.02em" }}>{title}</span>
        {sub && <span className="text-[11px] text-muted">{sub}</span>}
      </div>
      {action}
    </div>
  );
}
