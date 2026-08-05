"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { visibleNavGroups, isActive } from "./nav";

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "AG";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const name = user?.name || "AutoGRC user";
  const role = user?.role ? roleLabel(user.role) : "Signed in";
  const groups = visibleNavGroups(user?.role);

  return (
    <div className="flex h-full flex-col text-white" style={{ background: "#1A1A24" }}>
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-[22px]" style={{ borderBottom: "1px solid #2E2E38" }}>
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="text-[18px] font-bold" style={{ color: "#FFE600", letterSpacing: "-0.02em" }}>AutoGRC</span>
          <span className="text-[10px]" style={{ color: "#9A9AA6" }}>Automated assurance</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3">
        {groups.map((group, gi) => (
          <div key={gi} className="mb-1">
            {group.label && (
              <div className="px-5 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: "#5A5A66" }}>
                {group.label}
              </div>
            )}
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className="ey-nav-item flex items-center gap-3 px-[18px] py-[11px] text-[13px] font-bold"
                  style={{
                    color: active ? "#FFFFFF" : "#B6B6C0",
                    background: active ? "#2E2E38" : "transparent",
                    borderLeft: `3px solid ${active ? "#FFE600" : "transparent"}`,
                    letterSpacing: "-0.01em",
                  }}
                >
                  <span className="flex-none">{item.icon}</span>
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.demo && (
                    <span className="flex-none px-1.5 py-0.5 text-[9px] font-bold" style={{ background: "#3A3A46", color: "#9A9AA6" }}>
                      DEMO
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="flex items-center gap-3 px-[18px] py-4" style={{ borderTop: "1px solid #2E2E38" }}>
        <div className="flex h-[34px] w-[34px] flex-none items-center justify-center text-[13px] font-bold" style={{ background: "#FFE600", color: "#1A1A24", letterSpacing: "-0.02em" }}>
          {initialsOf(name)}
        </div>
        <div className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="truncate text-[13px] font-bold" style={{ letterSpacing: "-0.01em" }}>{name}</span>
          <span className="truncate text-[11px]" style={{ color: "#9A9AA6" }}>{role}</span>
        </div>
        <button
          onClick={() => logout()}
          title="Sign out"
          className="ey-signout flex flex-none p-1"
          style={{ color: "#9A9AA6", background: "transparent", border: 0, cursor: "pointer" }}
        >
          <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M7 15.5 H3.5 V2.5 H7" /><path d="M11 12 L14.5 9 L11 6" /><line x1="14.5" y1="9" x2="7" y2="9" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {/* Desktop: fixed rail */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[248px] flex-none lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile: off-canvas drawer */}
      <div className={`lg:hidden ${open ? "" : "pointer-events-none"}`}>
        {/* backdrop */}
        <div
          onClick={onClose}
          className={`fixed inset-0 z-[60] bg-black/50 transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`}
        />
        {/* panel */}
        <div
          className={`fixed left-0 top-0 z-[61] h-screen w-[248px] transition-transform duration-200 ease-out ${open ? "translate-x-0" : "-translate-x-full"}`}
        >
          <SidebarContent onNavigate={onClose} />
        </div>
      </div>
    </>
  );
}

function roleLabel(role: string): string {
  return (
    {
      admin: "Administrator",
      compliance_lead: "Compliance lead",
      assessor: "Assessor",
      viewer: "Viewer",
    }[role] || role
  );
}
