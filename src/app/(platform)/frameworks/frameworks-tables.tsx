"use client"

import { useDeactivatedFrameworks } from "./deactivated-context"
import Link from "next/link"
import { useState } from "react"
import * as XLSX from "xlsx"
export const dynamic = "force-dynamic"
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

type UnmappedControlsData = {
  masterFramework: { id: string; name: string } | null
  frameworks: {
    id: string
    name: string
    unmappedCount: number
  }[]
  activeFramework: { id: string; name: string } | null
  rows: {
    id: string
    domain: string
    subDomain: string | null
    controlCode: string
    statement: string
    controlType: string | null
    controlScope: string | null
    isAutomated: boolean | null
    applicabilityCategories: string[]
  }[]
}

function buildFrameworksHref(params: {
  domain?: string | null
  gapFramework?: string | null
}): string {
  const qs = new URLSearchParams()
  if (params.domain) qs.set("domain", params.domain)
  if (params.gapFramework) qs.set("gapFramework", params.gapFramework)
  const s = qs.toString()
  return s ? `/frameworks?${s}` : "/frameworks"
}

function exportComparisonToExcel(
  comparison: FrameworkComparisonData,
  activeFrameworks: { id: string; name: string }[]
) {
  const rows = comparison.rows.map(row => {
    const excelRow: Record<string, string> = {
      Domain: row.domain,
      "Control ID": row.controlCode,
      "Control Description": row.statement,
      "Control Type": row.controlType ?? "",
      "Control Scope": row.controlScope ?? "",
      Automated: row.isAutomated ? "Yes" : "No",
      "Applicability": row.applicabilityCategories.join(", "),
    }

    activeFrameworks.forEach(fw => {
      const cells = row.mappings[fw.id] ?? []
      if (cells.length === 0) {
        excelRow[fw.name] = ""
      } else {
        excelRow[fw.name] = cells
          .map(c => `${c.targetControlCode} (${c.overlapScore}% - ${c.status}): ${c.targetStatement}`)
          .join("\n\n")
      }
    })

    return excelRow
  })

  const ws = XLSX.utils.json_to_sheet(rows)
  
  const colWidths = [
    { wch: 20 }, // Domain
    { wch: 15 }, // Control ID
    { wch: 50 }, // Control Description
    { wch: 15 }, // Control Type
    { wch: 15 }, // Control Scope
    { wch: 10 }, // Automated
    { wch: 30 }, // Applicability
    ...activeFrameworks.map(() => ({ wch: 50 })), // Framework columns
  ]
  ws["!cols"] = colWidths

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Framework Comparison")

  const masterName = comparison.masterFramework?.name ?? "Master"
  const fileName = `${masterName}_Framework_Comparison_${new Date().toISOString().split("T")[0]}.xlsx`
  
  XLSX.writeFile(wb, fileName)
}

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
  const [isExporting, setIsExporting] = useState(false)

  const domains = comparison.domains ?? []

  const activeFrameworks = mounted
    ? comparison.frameworks.filter(f => !deactivated.has(f.id))
    : comparison.frameworks

  const visibleRows = activeDomain
    ? comparison.rows.filter(r => r.domain === activeDomain)
    : comparison.rows

  const masterColWidth = 360
  const targetColWidth = 280
  const targetCount = activeFrameworks.length
  const gridTemplateColumns = `${masterColWidth}px repeat(${targetCount}, ${targetColWidth}px)`
  const minGridWidth = masterColWidth + targetCount * targetColWidth

  if (activeFrameworks.length === 0) {
    return null
  }

  const handleExport = () => {
    setIsExporting(true)
    try {
      exportComparisonToExcel(comparison, activeFrameworks)
    } catch (error) {
      console.error("Export failed:", error)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#333333]">
            Controls frameworks baselined to master framework
          </h2>
          <p className="mt-1 text-base text-[#666666] max-w-4xl">
            Following section give a detailed comparison between different
            frameworks uploaded in the platform vis-avis internal controls
            framework of the organization (master framework)
          </p>
        </div>
        
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="flex items-center gap-2 px-4 py-2 bg-[#ffe600] hover:bg-[#ffd700] disabled:bg-[#cccccc] text-[#333333] font-semibold rounded-md transition-colors duration-200 shadow-sm disabled:cursor-not-allowed"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          {isExporting ? "Exporting..." : "Export to Excel"}
        </button>
      </div>

      <div className="rounded-lg border border-[#cccccc] bg-white shadow-sm overflow-hidden">
        <div className="grid grid-cols-[240px_1fr]">
          <aside className="border-r border-[#cccccc] bg-[#f9f9f9]">
            <div
              className="h-12 px-4 flex items-center text-sm font-bold uppercase tracking-wider text-[#333333] border-b border-[#cccccc]"
              style={{ backgroundColor: "#ffe600" }}
            >
              Control Domains
            </div>

            <div className="p-2 space-y-2">
              <DomainLink
                href={buildFrameworksHref({
                  domain: null,
                  gapFramework: selectedGapFramework,
                })}
                active={!activeDomain}
                label="All Domains"
              />
              {domains.map(d => (
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

          <section className="min-w-0 bg-white">
            <div className="max-h-[720px] overflow-auto">
              <div style={{ minWidth: minGridWidth }}>
                <div
                  className="sticky top-0 z-10 border-b border-[#cccccc]"
                  style={{ backgroundColor: "#ffe600" }}
                >
                  <div className="grid" style={{ gridTemplateColumns }}>
                    <div className="h-12 px-4 flex items-center font-bold text-[#333333]">
                      {comparison.masterFramework?.name ?? "Master"} (Master)
                    </div>

                    {activeFrameworks.map(fw => (
                      <div
                        key={fw.id}
                        className="h-12 px-4 flex items-center font-bold text-sm text-[#333333] whitespace-nowrap"
                      >
                        {fw.name}
                      </div>
                    ))}
                  </div>
                </div>

                {visibleRows.length === 0 ? (
                  <div className="p-6 text-sm text-[#666666]">
                    No controls found for this domain.
                  </div>
                ) : (
                  visibleRows.map(row => (
                    <div
                      key={row.controlId}
                      className="border-b border-[#e5e7eb] last:border-b-0 hover:bg-[#f9f9f9] transition-colors"
                    >
                      <div className="grid" style={{ gridTemplateColumns }}>
                        <div className="px-4 py-4">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="text-sm font-bold text-[#333333]">
                              {row.controlCode}
                            </div>
                            {row.isAutomated && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                Auto
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-1 mb-2">
                            {row.controlType && (
                              <span className={[
                                "px-2 py-0.5 rounded text-xs font-medium",
                                row.controlType === "Preventive" ? "bg-green-100 text-green-700" :
                                row.controlType === "Detective" ? "bg-yellow-100 text-yellow-700" :
                                "bg-purple-100 text-purple-700"
                              ].join(" ")}>
                                {row.controlType}
                              </span>
                            )}
                            {row.controlScope && (
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                                {row.controlScope}
                              </span>
                            )}
                          </div>

                          {row.applicabilityCategories.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {row.applicabilityCategories.map(cat => (
                                <span
                                  key={cat}
                                  className="px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700"
                                >
                                  {cat}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="mt-2 text-sm text-[#666666] leading-relaxed">
                            {row.statement}
                          </div>
                        </div>

                        {activeFrameworks.map(fw => {
                          const cells =
                            row.mappings[fw.id] ??
                            ([] as FrameworkComparisonCell[])

                          if (!cells.length) {
                            return <div key={fw.id} className="px-4 py-4" />
                          }

                          return (
                            <div key={fw.id} className="px-4 py-4 space-y-3">
                              {cells.map((c, idx) => (
                                <MappingCard
                                  key={`${fw.id}-${row.controlId}-${idx}-${c.targetControlCode}`}
                                  code={c.targetControlCode}
                                  statement={c.targetStatement}
                                  overlapScore={c.overlapScore}
                                  status={c.status}
                                />
                              ))}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export function UnmappedControlsTable({
  gaps,
  activeDomain,
  selectedGapFramework,
}: {
  gaps: UnmappedControlsData
  activeDomain: string | null
  selectedGapFramework: string | null
}) {
  const { deactivated, mounted } = useDeactivatedFrameworks()

  const activeFrameworks = mounted
    ? gaps.frameworks.filter(f => !deactivated.has(f.id))
    : gaps.frameworks

  const effectiveActiveGap = mounted
    ? selectedGapFramework &&
      activeFrameworks.some(f => f.id === selectedGapFramework)
      ? gaps.activeFramework
      : activeFrameworks[0]
    : gaps.activeFramework

  if (activeFrameworks.length === 0) {
    return null
  }

  const idColWidth = 180
  const domainColWidth = 220
  const subDomainColWidth = 240
  const descMinWidth = 520

  const gridTemplateColumns = `
    ${idColWidth}px
    ${domainColWidth}px
    ${subDomainColWidth}px
    minmax(${descMinWidth}px, 1fr)
  `

  const minGridWidth =
    idColWidth + domainColWidth + subDomainColWidth + descMinWidth

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-[#333333]">
          Additional controls vis-a-vis reference controls frameworks
        </h2>
        <p className="mt-1 text-base text-[#666666] max-w-4xl">
          Summary of controls that are not present in the internal (master)
          controls framework when compared against activated reference
          frameworks.
        </p>
      </div>

      <div className="rounded-lg border border-[#cccccc] bg-white shadow-sm overflow-hidden">
        <div className="grid grid-cols-[280px_1fr]">
          {/* Framework selector */}
          <aside className="border-r border-[#cccccc] bg-[#f9f9f9]">
            <div
              className="h-12 px-4 flex items-center text-sm font-bold uppercase tracking-wider text-[#333333] border-b border-[#cccccc]"
              style={{ backgroundColor: "#ffe600" }}
            >
              Frameworks
            </div>

            <div className="p-2 space-y-2">
              {activeFrameworks.map(fw => {
                const active = effectiveActiveGap?.id === fw.id
                return (
                  <Link
                    key={fw.id}
                    href={buildFrameworksHref({
                      domain: activeDomain,
                      gapFramework: fw.id,
                    })}
                    scroll={false}
                    className={[
                      "block rounded-md p-4 transition-all duration-200",
                      active
                        ? "bg-[#ffe600] text-[#333333] shadow-sm"
                        : "bg-[#2e2e38] hover:bg-[#3e3e48] text-white",
                    ].join(" ")}
                  >
                    <div className="text-sm font-bold">{fw.name}</div>
                    <div
                      className={[
                        "text-xs mt-1",
                        active ? "text-[#666666]" : "text-[#cccccc]",
                      ].join(" ")}
                    >
                      {fw.unmappedCount.toLocaleString()} unmapped controls
                    </div>
                  </Link>
                )
              })}
            </div>
          </aside>

          {/* Table */}
          <section className="min-w-0 bg-white">
            <div className="max-h-[720px] overflow-auto">
              <div style={{ minWidth: minGridWidth }}>
                {/* Header */}
                <div
                  className="sticky top-0 z-10 border-b border-[#cccccc]"
                  style={{ backgroundColor: "#ffe600" }}
                >
                  <div
                    className="grid"
                    style={{ gridTemplateColumns }}
                  >
                    <HeaderCell>Control ID</HeaderCell>
                    <HeaderCell>Domain</HeaderCell>
                    <HeaderCell>Sub-domain</HeaderCell>
                    <HeaderCell>Control Description</HeaderCell>
                  </div>
                </div>

                {/* Rows */}
                {gaps.rows.length === 0 ? (
                  <div className="p-6 text-sm text-[#666666]">
                    No unmapped controls for this framework.
                  </div>
                ) : (
                  gaps.rows.map(r => (
                    <div
                      key={r.id}
                      className="border-b border-[#e5e7eb] last:border-b-0 hover:bg-[#f9f9f9] transition-colors"
                    >
                      <div
                        className="grid"
                        style={{ gridTemplateColumns }}
                      >
                        <BodyCell>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#333333]">{r.controlCode}</span>
                            {r.isAutomated && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                              </span>
                            )}
                          </div>
                        </BodyCell>
                        <BodyCell strong>{r.domain}</BodyCell>
                        <BodyCell>
                          {r.subDomain ?? "—"}
                        </BodyCell>
                        <BodyCell muted>
                          {r.statement}
                        </BodyCell>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

/* ---------- Small helpers ---------- */

function HeaderCell({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-12 px-4 flex items-center text-sm font-bold text-[#333333]">
      {children}
    </div>
  )
}

function BodyCell({
  children,
  strong,
  muted,
}: {
  children: React.ReactNode
  strong?: boolean
  muted?: boolean
}) {
  return (
    <div className="px-4 py-4">
      <div
        className={[
          "text-sm leading-relaxed",
          strong && "font-bold text-[#333333]",
          muted && "text-[#666666]",
          !strong && !muted && "text-[#333333]",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {children}
      </div>
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
      className={[
        "block rounded-md px-3 py-3 transition-all duration-200",
        active
          ? "bg-[#ffe600] text-[#333333] shadow-sm"
          : "bg-[#2e2e38] hover:bg-[#3e3e48] text-white",
      ].join(" ")}
    >
      <div className="text-sm font-bold">{label}</div>
    </Link>
  )
}

function MappingCard({
  code,
  statement,
  overlapScore,
  status,
}: {
  code: string
  statement: string
  overlapScore: number
  status: string
}) {
  const scoreColor = overlapScore >= 80 ? "text-green-600" : overlapScore >= 50 ? "text-yellow-600" : "text-red-600"
  const badgeColor = status === "Full Overlap" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"

  return (
    <div className="rounded border border-[#cccccc] bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="text-sm font-bold text-[#333333]">{code}</div>
        <div className="flex items-center gap-1">
          <span className={`text-xs font-bold ${scoreColor}`}>{overlapScore}%</span>
          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${badgeColor}`}>
            {status === "Full Overlap" ? "Full" : "Partial"}
          </span>
        </div>
      </div>
      <div className="mt-1 text-xs text-[#666666] leading-relaxed line-clamp-5">
        {statement}
      </div>
    </div>
  )
}