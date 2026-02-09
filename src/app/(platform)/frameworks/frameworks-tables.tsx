"use client"

import { useDeactivatedFrameworks } from "./deactivated-context"
import Link from "next/link"
import { useState } from "react"

/* ================= TYPES ================= */

type FrameworkComparisonCell = {
  targetControlCode: string
  targetStatement: string
  overlapScore: number
  status: string
}

type FrameworkComparisonRow = {
  controlId: string
  domain: string
  controlCode: string
  statement: string
  controlType: string | null
  controlScope: string | null
  isAutomated: boolean | null
  applicabilityCategories: string[]
  mappings: Record<string, FrameworkComparisonCell[]>
}

type FrameworkComparisonData = {
  masterFramework: { id: string; name: string } | null
  domains: string[]
  frameworks: { id: string; name: string }[]
  rows: FrameworkComparisonRow[]
}

/* ================= HELPERS ================= */

function buildFrameworksHref(params: {
  domain?: string | null
  gapFramework?: string | null
}) {
  const qs = new URLSearchParams()
  if (params.domain) qs.set("domain", params.domain)
  if (params.gapFramework) qs.set("gapFramework", params.gapFramework)
  return `/frameworks${qs.toString() ? `?${qs}` : ""}`
}

/* ================= CONSTANTS ================= */

const ROW_HEIGHT = 96
const VISIBLE_ROWS = 6
const BODY_HEIGHT = ROW_HEIGHT * VISIBLE_ROWS

/* ================= MAIN TABLE ================= */

export function ComparisonTable({
  comparison,
  activeDomain,
  selectedGapFramework,
}: {
  comparison: FrameworkComparisonData
  activeDomain: string | null
  selectedGapFramework: string | null
}) {
  const { deactivated, mounted } = useDeactivatedFrameworks()
  const [masterFilter] = useState("")
  const [frameworkFilters] = useState<Record<string, string>>({})

  const activeFrameworks = mounted
    ? comparison.frameworks.filter(f => !deactivated.has(f.id))
    : comparison.frameworks

  const domainFiltered = activeDomain
    ? comparison.rows.filter(r => r.domain === activeDomain)
    : comparison.rows

  const visibleRows = domainFiltered.filter(row => {
    const masterMatch =
      !masterFilter ||
      row.controlCode.toLowerCase().includes(masterFilter.toLowerCase()) ||
      row.statement.toLowerCase().includes(masterFilter.toLowerCase())

    const frameworkMatches = activeFrameworks.every(fw => {
      const v = frameworkFilters[fw.id]
      if (!v) return true
      const cells = row.mappings[fw.id] ?? []
      return cells.some(c =>
        c.targetControlCode.toLowerCase().includes(v.toLowerCase()) ||
        c.targetStatement.toLowerCase().includes(v.toLowerCase())
      )
    })

    return masterMatch && frameworkMatches
  })

  /* ===== GRID TEMPLATE (STABLE) ===== */
  const gridTemplateColumns = [
    "minmax(360px, 1fr)",
    ...activeFrameworks.map(() => "minmax(260px, 1fr)"),
  ].join(" ")

  const minWidth = 360 + activeFrameworks.length * 260

  return (
    <div className="glass-dark rounded-xl overflow-hidden">
      <div className="grid grid-cols-[260px_1fr] min-h-[640px]">

        {/* ===== DOMAIN SIDEBAR ===== */}
        <aside className="border-r border-white/10">
          <div className="px-4 py-3 font-bold text-sm uppercase border-b border-white/10">
            Domains
          </div>

          <div className="p-2 space-y-2">
            <DomainLink
              href={buildFrameworksHref({ gapFramework: selectedGapFramework })}
              active={!activeDomain}
              label="All Domains"
            />

            {comparison.domains.map(d => (
              <DomainLink
                key={d}
                href={buildFrameworksHref({
                  domain: d,
                  gapFramework: selectedGapFramework,
                })}
                active={activeDomain === d}
                label={d}
              />
            ))}
          </div>
        </aside>

        {/* ===== TABLE ===== */}
        <section className="relative overflow-x-auto">
          <div style={{ minWidth }}>

            {/* ===== SINGLE GRID (HEADER + BODY SHARE IT) ===== */}
            <div className="grid" style={{ gridTemplateColumns }}>

              {/* ===== HEADER ===== */}
              <div className="sticky top-0 z-10 glass-dark border-b border-white/10 contents">
                <HeaderCell>
                  {comparison.masterFramework?.name ?? "Master"}
                </HeaderCell>

                {activeFrameworks.map(fw => (
                  <HeaderCell key={fw.id}>{fw.name}</HeaderCell>
                ))}
              </div>

              {/* ===== BODY ===== */}
              <div
                className="col-span-full overflow-y-auto"
                style={{ maxHeight: BODY_HEIGHT }}
              >
                {visibleRows.map(row => (
                  <div
                    key={row.controlId}
                    className="grid border-b border-white/5 hover:bg-white/5"
                    style={{ gridTemplateColumns }}
                  >
                    <BodyCell strong>
                      <div className="mb-1">{row.controlCode}</div>
                      <div className="text-xs text-white/60">
                        {row.statement}
                      </div>
                    </BodyCell>

                    {activeFrameworks.map(fw => (
                      <BodyCell key={fw.id}>
                        {(row.mappings[fw.id] ?? []).map((c, i) => (
                          <MappingCard key={i} {...c} />
                        ))}
                      </BodyCell>
                    ))}
                  </div>
                ))}
              </div>

            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

/* ================= UI PARTS ================= */

function HeaderCell({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 py-3 font-bold text-white border-r border-white/5 last:border-r-0">
      {children}
    </div>
  )
}

function BodyCell({
  children,
  strong,
}: {
  children: React.ReactNode
  strong?: boolean
}) {
  return (
    <div
      className={
        strong
          ? "px-4 py-4 font-semibold border-r border-white/5 last:border-r-0"
          : "px-4 py-4 border-r border-white/5 last:border-r-0"
      }
    >
      {children}
    </div>
  )
}

function DomainLink({
  href,
  active,
  label,
}: {
  href: string
  active: boolean
  label: string
}) {
  return (
    <Link
      href={href}
      scroll={false}
      className={
        active
          ? "block rounded-md p-3 bg-yellow-400 text-black"
          : "block rounded-md p-3 bg-white/5 text-white hover:bg-white/10"
      }
    >
      {label}
    </Link>
  )
}

function MappingCard({
  targetControlCode,
  targetStatement,
  overlapScore,
}: FrameworkComparisonCell) {
  return (
    <div className="rounded-md border border-white/10 bg-white/5 p-2 mb-2">
      <div className="flex justify-between text-xs font-bold text-white">
        <span>{targetControlCode}</span>
        <span>{overlapScore}%</span>
      </div>
      <div className="text-xs text-white/60 mt-1 line-clamp-4">
        {targetStatement}
      </div>
    </div>
  )
}
