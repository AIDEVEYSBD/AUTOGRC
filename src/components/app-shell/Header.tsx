"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { pageMeta } from "./nav";

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "AG";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Header({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();
  const { title, sub } = pageMeta(pathname);
  const { user, logout } = useAuth();

  const [dark, setDark] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch {}
  };

  const name = user?.name || "AutoGRC user";

  return (
    <header
      className="sticky top-0 z-30 flex h-[66px] flex-none items-center gap-3 px-4 sm:px-7"
      style={{ background: "var(--card)", borderBottom: "1px solid var(--hair)" }}
    >
      {/* Hamburger (mobile) */}
      <button
        onClick={onMenu}
        className="-ml-1 flex h-10 w-10 flex-none items-center justify-center lg:hidden"
        style={{ color: "var(--ink)" }}
        aria-label="Open menu"
      >
        <svg width="20" height="20" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8">
          <line x1="2.5" y1="5" x2="15.5" y2="5" /><line x1="2.5" y1="9" x2="15.5" y2="9" /><line x1="2.5" y1="13" x2="15.5" y2="13" />
        </svg>
      </button>

      {/* Title */}
      <div className="flex min-w-0 flex-col gap-0.5">
        <h1 className="m-0 truncate text-[18px] font-bold leading-none sm:text-[21px]" style={{ color: "var(--ink)", letterSpacing: "-0.025em" }}>
          {title}
        </h1>
        <span className="hidden truncate text-[12px] sm:block" style={{ color: "var(--muted)", letterSpacing: "-0.01em" }}>{sub}</span>
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="flex h-10 items-center justify-center gap-2 px-3"
          style={{ color: "var(--ink)", border: "1px solid var(--bd)" }}
          title={dark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {dark ? (
            <svg width="15" height="15" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="9" cy="9" r="3.4" /><path d="M9 1.5V3M9 15v1.5M1.5 9H3M15 9h1.5M3.6 3.6l1 1M13.4 13.4l1 1M3.6 14.4l1-1M13.4 4.6l1-1" /></svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M15 10 A6.5 6.5 0 0 1 8 3 A6.5 6.5 0 1 0 15 10 Z" /></svg>
          )}
          <span className="hidden text-[12px] font-bold sm:inline" style={{ letterSpacing: "-0.01em" }}>{dark ? "Dark" : "Light"}</span>
        </button>

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center text-[12px] font-bold"
            style={{ background: "#1A1A24", color: "#fff" }}
            aria-label="Account"
          >
            {initialsOf(name)}
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-56" style={{ background: "var(--card)", border: "1px solid var(--bd)" }}>
              <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--hair)" }}>
                <div className="truncate text-[13px] font-bold" style={{ color: "var(--ink)" }}>{name}</div>
                {user?.email && <div className="truncate text-[11px]" style={{ color: "var(--muted)" }}>{user.email}</div>}
              </div>
              {user?.role === "admin" && (
                <Link href="/settings" onClick={() => setMenuOpen(false)} className="block px-4 py-2.5 text-[13px] font-bold" style={{ color: "var(--ink)" }}>
                  Settings
                </Link>
              )}
              <button onClick={() => logout()} className="block w-full px-4 py-2.5 text-left text-[13px] font-bold" style={{ color: "var(--st-fail)" }}>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
