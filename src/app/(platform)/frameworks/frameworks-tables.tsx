"use client"

import { useDeactivatedFrameworks } from "./deactivated-context"
import Link from "next/link"
import { useState } from "react"
import * as XLSX from "xlsx"

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
  const [masterFilter, setMasterFilter] = useState("")
  const [frameworkFilters, setFrameworkFilters] = useState<Record<string, string>>({})

  const domains = comparison.domains ?? []

  const activeFrameworks = mounted
    ? comparison.frameworks.filter(f => !deactivated.has(f.id))
    : comparison.frameworks

  // Apply domain filter
  const domainFiltered = activeDomain
    ? comparison.rows.filter(r => r.domain === activeDomain)
    : comparison.rows

  // Apply all filters
  const visibleRows = domainFiltered.filter(row => {
    // Master framework filter
    const masterMatch = 
      !masterFilter ||
      row.controlCode.toLowerCase().includes(masterFilter.toLowerCase()) ||
      row.statement.toLowerCase().includes(masterFilter.toLowerCase())

    // Framework-specific filters
    const frameworkMatches = activeFrameworks.every(fw => {
      const filterValue = frameworkFilters[fw.id]
      if (!filterValue) return true // No filter for this framework
      
      const cells = row.mappings[fw.id] ?? []
      if (cells.length === 0) return false // No mappings, doesn't match filter
      
      // Check if any mapping in this framework matches the filter
      return cells.some(cell => 
        cell.targetControlCode.toLowerCase().includes(filterValue.toLowerCase()) ||
        cell.targetStatement.toLowerCase().includes(filterValue.toLowerCase())
      )
    })

    return masterMatch && frameworkMatches
  })

  const masterColWidth = 360
  const targetColWidth = 280
  const targetCount = activeFrameworks.length
  const gridTemplateColumns = `${masterColWidth}px repeat(${targetCount}, ${targetColWidth}px)`
  const minGridWidth = masterColWidth + targetCount * targetColWidth

  const activeFilterCount = 
    (masterFilter !== "" ? 1 : 0) +
    Object.values(frameworkFilters).filter(f => f !== "").length

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-md-on-surface">
            Controls frameworks baselined to master framework
          </h2>
          <p className="mt-1 text-base text-md-on-surface-variant max-w-4xl">
            Following section give a detailed comparison between different
            frameworks uploaded in the platform vis-avis internal controls
            framework of the organization (master framework)
          </p>
        </div>
        
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="flex items-center gap-2 px-4 py-2 bg-md-primary-container hover:opacity-90 disabled:opacity-50 text-md-on-primary-container font-semibold rounded-md transition-colors duration-200 shadow-sm disabled:cursor-not-allowed"
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

      {/* Filter Status Bar */}
      {activeFilterCount > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-md-outline-variant bg-md-surface-container p-4 shadow-sm">
          <div className="text-sm text-md-on-surface-variant">
            {visibleRows.length} of {domainFiltered.length} controls
            {activeFilterCount > 0 && (
              <span className="ml-2 text-md-on-surface-variant">
                • {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""} active
              </span>
            )}
          </div>
          <button
            onClick={() => {
              setMasterFilter("")
              setFrameworkFilters({})
            }}
            className="text-sm text-md-primary hover:opacity-80 font-medium"
          >
            Clear all filters
          </button>
        </div>
      )}

      <div className="rounded-xl border border-md-outline-variant bg-md-surface-container shadow-sm overflow-hidden">
        <div className="flex flex-col md:grid md:grid-cols-[240px_1fr]">
          <aside className="border-b md:border-b-0 md:border-r border-md-outline-variant bg-md-surface-container">
            <div
              className="h-12 px-4 flex items-center text-sm font-bold uppercase tracking-wider text-md-on-surface border-b border-md-outline-variant"
              style={{ backgroundColor: "var(--md-primary-container)" }}
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

          <section className="min-w-0 bg-md-surface-container">
            <div className="max-h-[720px] overflow-auto">
              <div style={{ minWidth: minGridWidth }}>
                <div
                  className="sticky top-0 z-10 border-b border-md-outline-variant"
                  style={{ backgroundColor: "var(--md-primary-container)" }}
                >
                  <div className="grid" style={{ gridTemplateColumns }}>
                    <div className="h-12 px-4 flex items-center gap-2 font-bold text-md-on-surface">
                      <span>{comparison.masterFramework?.name ?? "Master"} (Master)</span>
                      <FilterDropdown
                        label={`${comparison.masterFramework?.name ?? "Master"} controls`}
                        value={masterFilter}
                        onChange={setMasterFilter}
                        onClear={() => setMasterFilter("")}
                      />
                    </div>

                    {activeFrameworks.map(fw => (
                      <div
                        key={fw.id}
                        className="h-12 px-4 flex items-center gap-2 font-bold text-sm text-md-on-surface whitespace-nowrap"
                      >
                        <span>{fw.name}</span>
                        <FilterDropdown
                          label={`${fw.name} mappings`}
                          value={frameworkFilters[fw.id] || ""}
                          onChange={(value) => setFrameworkFilters(prev => ({ ...prev, [fw.id]: value }))}
                          onClear={() => setFrameworkFilters(prev => {
                            const newFilters = { ...prev }
                            delete newFilters[fw.id]
                            return newFilters
                          })}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {visibleRows.length === 0 ? (
                  <div className="p-6 text-sm text-md-on-surface-variant">
                    {activeFilterCount > 0
                      ? "No controls match your filters."
                      : "No controls found for this domain."}
                  </div>
                ) : (
                  visibleRows.map(row => (
                    <div
                      key={row.controlId}
                      className="border-b border-md-outline-variant last:border-b-0 hover:bg-md-surface-container transition-colors"
                    >
                      <div className="grid" style={{ gridTemplateColumns }}>
                        <div className="px-4 py-4">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="text-sm font-bold text-md-on-surface">
                              {row.controlCode}
                            </div>
                            {row.isAutomated && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-md-primary-container/30 text-md-on-surface">
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

                          <div className="mt-2 text-sm text-md-on-surface-variant leading-relaxed">
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
  const [filters, setFilters] = useState({
    controlCode: "",
    domain: "",
    subDomain: "",
    statement: "",
  })

  const activeFrameworks = mounted
    ? gaps.frameworks.filter(f => !deactivated.has(f.id))
    : gaps.frameworks

  const effectiveActiveGap = mounted
    ? selectedGapFramework &&
      activeFrameworks.some(f => f.id === selectedGapFramework)
      ? gaps.activeFramework
      : activeFrameworks[0]
    : gaps.activeFramework

  // Apply text filters
  const visibleRows = gaps.rows.filter(row => {
    const controlCodeMatch = 
      !filters.controlCode ||
      row.controlCode.toLowerCase().includes(filters.controlCode.toLowerCase())
    
    const domainMatch = 
      !filters.domain ||
      row.domain.toLowerCase().includes(filters.domain.toLowerCase())
    
    const subDomainMatch = 
      !filters.subDomain ||
      (row.subDomain && row.subDomain.toLowerCase().includes(filters.subDomain.toLowerCase()))
    
    const statementMatch = 
      !filters.statement ||
      row.statement.toLowerCase().includes(filters.statement.toLowerCase())

    return controlCodeMatch && domainMatch && subDomainMatch && statementMatch
  })

  const activeFilterCount = Object.values(filters).filter(f => f !== "").length

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
        <h2 className="text-2xl font-bold text-md-on-surface">
          Additional controls vis-a-vis reference controls frameworks
        </h2>
        <p className="mt-1 text-base text-md-on-surface-variant max-w-4xl">
          Summary of controls that are not present in the internal (master)
          controls framework when compared against activated reference
          frameworks.
        </p>
      </div>

      {/* Filter Status Bar */}
      {activeFilterCount > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-md-outline-variant bg-md-surface-container p-4 shadow-sm">
          <div className="text-sm text-md-on-surface-variant">
            {visibleRows.length} of {gaps.rows.length} controls
            {activeFilterCount > 0 && (
              <span className="ml-2 text-md-on-surface-variant">
                • {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""} active
              </span>
            )}
          </div>
          <button
            onClick={() => {
              setFilters({
                controlCode: "",
                domain: "",
                subDomain: "",
                statement: "",
              })
            }}
            className="text-sm text-md-primary hover:opacity-80 font-medium"
          >
            Clear all filters
          </button>
        </div>
      )}

      <div className="rounded-xl border border-md-outline-variant bg-md-surface-container shadow-sm overflow-hidden">
        <div className="flex flex-col md:grid md:grid-cols-[280px_1fr]">
          {/* Framework selector */}
          <aside className="border-b md:border-b-0 md:border-r border-md-outline-variant bg-md-surface-container">
            <div
              className="h-12 px-4 flex items-center text-sm font-bold uppercase tracking-wider text-md-on-surface border-b border-md-outline-variant"
              style={{ backgroundColor: "var(--md-primary-container)" }}
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
                        ? "bg-md-primary-container text-md-on-primary-container shadow-sm"
                        : "bg-md-primary hover:opacity-90 text-md-on-primary",
                    ].join(" ")}
                  >
                    <div className="text-sm font-bold">{fw.name}</div>
                    <div
                      className={[
                        "text-xs mt-1",
                        active ? "text-md-on-surface-variant" : "text-[#cccccc]",
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
          <section className="min-w-0 bg-md-surface-container">
            <div className="max-h-[720px] overflow-auto">
              <div style={{ minWidth: minGridWidth }}>
                {/* Header */}
                <div
                  className="sticky top-0 z-10 border-b border-md-outline-variant"
                  style={{ backgroundColor: "var(--md-primary-container)" }}
                >
                  <div
                    className="grid"
                    style={{ gridTemplateColumns }}
                  >
                    <HeaderCellWithFilter
                      label="Control ID"
                      value={filters.controlCode}
                      onChange={(value) => setFilters(prev => ({ ...prev, controlCode: value }))}
                      onClear={() => setFilters(prev => ({ ...prev, controlCode: "" }))}
                    />
                    <HeaderCellWithFilter
                      label="Domain"
                      value={filters.domain}
                      onChange={(value) => setFilters(prev => ({ ...prev, domain: value }))}
                      onClear={() => setFilters(prev => ({ ...prev, domain: "" }))}
                    />
                    <HeaderCellWithFilter
                      label="Sub-domain"
                      value={filters.subDomain}
                      onChange={(value) => setFilters(prev => ({ ...prev, subDomain: value }))}
                      onClear={() => setFilters(prev => ({ ...prev, subDomain: "" }))}
                    />
                    <HeaderCellWithFilter
                      label="Control Description"
                      value={filters.statement}
                      onChange={(value) => setFilters(prev => ({ ...prev, statement: value }))}
                      onClear={() => setFilters(prev => ({ ...prev, statement: "" }))}
                    />
                  </div>
                </div>

                {/* Rows */}
                {visibleRows.length === 0 ? (
                  <div className="p-6 text-sm text-md-on-surface-variant">
                    {activeFilterCount > 0
                      ? "No controls match your filters."
                      : "No unmapped controls for this framework."}
                  </div>
                ) : (
                  visibleRows.map(r => (
                    <div
                      key={r.id}
                      className="border-b border-md-outline-variant last:border-b-0 hover:bg-md-surface-container transition-colors"
                    >
                      <div
                        className="grid"
                        style={{ gridTemplateColumns }}
                      >
                        <BodyCell>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-md-on-surface">{r.controlCode}</span>
                            {r.isAutomated && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-md-primary-container/30 text-md-on-surface">
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

/* ---------- Filter Components ---------- */

function FilterDropdown({
  label,
  value,
  onChange,
  onClear,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  onClear: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        className={`p-1 rounded hover:bg-md-surface-container-high transition-colors ${
          value ? "text-md-primary" : "text-md-on-surface-variant"
        }`}
        title={`Filter ${label}`}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-2 z-20 bg-md-surface-container rounded-xl border border-md-outline-variant shadow-lg p-3 min-w-[250px]">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={`Filter ${label.toLowerCase()}...`}
                className="flex-1 px-3 py-1.5 text-sm border border-md-outline-variant rounded-lg bg-md-surface text-md-on-surface focus:outline-none focus:ring-2 focus:ring-md-primary-container"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
              {value && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onClear()
                  }}
                  className="p-1.5 text-md-on-surface-variant hover:text-md-on-surface hover:bg-md-surface-container-high rounded"
                  title="Clear filter"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function HeaderCellWithFilter({
  label,
  value,
  onChange,
  onClear,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  onClear: () => void
}) {
  return (
    <div className="h-12 px-4 flex items-center gap-2 text-sm font-bold text-md-on-surface">
      <span>{label}</span>
      <FilterDropdown
        label={label}
        value={value}
        onChange={onChange}
        onClear={onClear}
      />
    </div>
  )
}

/* ---------- Small helpers ---------- */

function HeaderCell({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-12 px-4 flex items-center text-sm font-bold text-md-on-surface">
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
          strong && "font-bold text-md-on-surface",
          muted && "text-md-on-surface-variant",
          !strong && !muted && "text-md-on-surface",
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
          ? "bg-md-primary-container text-md-on-primary-container shadow-sm"
          : "bg-md-primary hover:opacity-90 text-md-on-primary",
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
    <div className="rounded-lg border border-md-outline-variant bg-md-surface-container p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="text-sm font-bold text-md-on-surface">{code}</div>
        <div className="flex items-center gap-1">
          <span className={`text-xs font-bold ${scoreColor}`}>{overlapScore}%</span>
          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${badgeColor}`}>
            {status === "Full Overlap" ? "Full" : "Partial"}
          </span>
        </div>
      </div>
      <div className="mt-1 text-xs text-md-on-surface-variant leading-relaxed line-clamp-5">
        {statement}
      </div>
    </div>
  )
}