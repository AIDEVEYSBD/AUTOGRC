"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"

const STORAGE_KEY = "autogrc_deactivated_frameworks"

type DeactivatedContextType = {
  deactivated: Set<string>
  toggleFramework: (frameworkId: string) => void
  mounted: boolean
}

const DeactivatedContext = createContext<DeactivatedContextType | null>(null)

export function DeactivatedFrameworksProvider({
  children,
}: {
  children: ReactNode
}) {
  const [deactivated, setDeactivated] = useState<Set<string>>(new Set())
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as string[]
        setDeactivated(new Set(parsed))
      } catch (e) {
        console.error("Failed to parse deactivated frameworks", e)
      }
    }
  }, [])

  const toggleFramework = (frameworkId: string) => {
    setDeactivated(prev => {
      const next = new Set(prev)
      if (next.has(frameworkId)) {
        next.delete(frameworkId)
      } else {
        next.add(frameworkId)
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]))
      return next
    })
  }

  return (
    <DeactivatedContext.Provider value={{ deactivated, toggleFramework, mounted }}>
      {children}
    </DeactivatedContext.Provider>
  )
}

export function useDeactivatedFrameworks() {
  const context = useContext(DeactivatedContext)
  if (!context) {
    throw new Error(
      "useDeactivatedFrameworks must be used within DeactivatedFrameworksProvider"
    )
  }
  return context
}