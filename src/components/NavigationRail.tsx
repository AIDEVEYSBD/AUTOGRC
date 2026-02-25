"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"

const NAV_ITEMS = [
  {
    href: "/overview",
    label: "Overview",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    href: "/frameworks",
    label: "Frameworks",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
        <path d="M2 17l10 5 10-5"/>
        <path d="M2 12l10 5 10-5"/>
      </svg>
    ),
  },
  {
    href: "/applications",
    label: "Applications",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/>
        <path d="M8 21h8M12 17v4"/>
      </svg>
    ),
  },
  {
    href: "/integrations",
    label: "Integrations",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
      </svg>
    ),
  },
  {
    href: "/landing",
    label: "Capabilities",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
    ),
  },
]

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
    </svg>
  )
}

export default function NavigationRail() {
  const pathname = usePathname()
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem("theme")
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    const isDark = stored === "dark" || (!stored && prefersDark)
    if (isDark) {
      document.documentElement.classList.add("dark")
      setDark(true)
    }
  }, [])

  const toggleDark = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle("dark", next)
    localStorage.setItem("theme", next ? "dark" : "light")
  }

  return (
    <>
      {/* Desktop Navigation Rail */}
      <nav
        className="fixed left-0 top-0 bottom-0 z-50 hidden md:flex flex-col items-center w-20 py-4"
        style={{
          backgroundColor: "var(--md-surface-container)",
          borderRight: "1px solid var(--md-outline-variant)",
        }}
      >
        {/* Logo */}
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mb-8 font-extrabold text-sm tracking-tight flex-shrink-0"
          style={{
            backgroundColor: "var(--md-primary-container)",
            color: "var(--md-on-primary-container)",
          }}
        >
          AG
        </div>

        {/* Nav items */}
        <div className="flex-1 flex flex-col gap-0.5 w-full px-2">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link key={item.href} href={item.href} className="flex flex-col items-center gap-1 py-1">
                <div
                  className="w-16 h-8 rounded-full flex items-center justify-center transition-all duration-150"
                  style={{ backgroundColor: isActive ? "var(--md-primary-container)" : "transparent" }}
                >
                  <span style={{ color: isActive ? "var(--md-on-primary-container)" : "var(--md-on-surface-variant)" }}>
                    {item.icon}
                  </span>
                </div>
                <span
                  className="text-[10px] tracking-wide leading-tight text-center"
                  style={{
                    color: isActive ? "var(--md-on-primary-container)" : "var(--md-on-surface-variant)",
                    fontWeight: isActive ? 600 : 400,
                  }}
                >
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>

        {/* Dark mode toggle */}
        <button
          onClick={toggleDark}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ color: "var(--md-on-surface-variant)" }}
          title={dark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {dark ? <SunIcon /> : <MoonIcon />}
        </button>
      </nav>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden h-16 items-center justify-around px-1"
        style={{
          backgroundColor: "var(--md-surface-container)",
          borderTop: "1px solid var(--md-outline-variant)",
        }}
      >
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link key={item.href} href={item.href} className="flex flex-col items-center gap-0.5 flex-1">
              <div
                className="w-12 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: isActive ? "var(--md-primary-container)" : "transparent" }}
              >
                <span style={{ color: isActive ? "var(--md-on-primary-container)" : "var(--md-on-surface-variant)" }}>
                  {item.icon}
                </span>
              </div>
              {isActive && (
                <span className="text-[10px] font-medium" style={{ color: "var(--md-on-primary-container)" }}>
                  {item.label}
                </span>
              )}
            </Link>
          )
        })}

        {/* Dark mode toggle — mobile */}
        <button
          onClick={toggleDark}
          className="flex flex-col items-center gap-0.5 flex-1"
          style={{ color: "var(--md-on-surface-variant)" }}
          title={dark ? "Light mode" : "Dark mode"}
        >
          <div className="w-12 h-8 rounded-full flex items-center justify-center">
            {dark ? <SunIcon /> : <MoonIcon />}
          </div>
          <span className="text-[10px]">{dark ? "Light" : "Dark"}</span>
        </button>
      </nav>
    </>
  )
}
