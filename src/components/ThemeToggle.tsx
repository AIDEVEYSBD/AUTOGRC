"use client"

import { useState, useEffect } from "react"

export default function ThemeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    // Sync with current state of the document
    setDark(document.documentElement.classList.contains("dark"))
  }, [])

  const toggle = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle("dark", next)
    localStorage.setItem("theme", next ? "dark" : "light")
  }

  return (
    <button
      onClick={toggle}
      className="fixed top-4 right-4 z-50 w-10 h-10 rounded-full flex items-center justify-center transition-colors"
      style={{
        backgroundColor: "var(--md-surface-container)",
        color: "var(--md-on-surface-variant)",
        border: "1px solid var(--md-outline-variant)",
      }}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {dark ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5"/>
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
        </svg>
      )}
    </button>
  )
}
