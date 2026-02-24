"use client"

import { useState } from "react"

type SecurityDomain = {
  id: string
  name: string
  controls: number
  avgCompliance: number
}

type ControlInDomain = {
  id: string
  controlCode: string
  controlStatement: string
  subDomain: string | null
  controlType: string | null
  isAutomated: boolean | null
  compliantApps: number
  nonCompliantApps: number
  avgScore: number
}

type ComplianceByDomainProps = {
  domains: SecurityDomain[]
  initialDomain: string | null
  initialControls: ControlInDomain[]
  onDomainChange: (domain: string) => Promise<ControlInDomain[]>
}

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
                  className="p-1.5 text-md-on-surface-variant hover:text-md-on-surface hover:bg-md-surface-container-high rounded-lg"
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

export function ComplianceByDomain({
  domains,
  initialDomain,
  initialControls,
  onDomainChange,
}: ComplianceByDomainProps) {
  const [selectedDomain, setSelectedDomain] = useState(initialDomain)
  const [controls, setControls] = useState(initialControls)
  const [isLoading, setIsLoading] = useState(false)
  const [controlIdFilter, setControlIdFilter] = useState("")
  const [statementFilter, setStatementFilter] = useState("")

  const handleDomainClick = async (domainName: string) => {
    if (domainName === selectedDomain) return

    setIsLoading(true)
    setSelectedDomain(domainName)

    try {
      const newControls = await onDomainChange(domainName)
      setControls(newControls)
    } catch (error) {
      console.error("Failed to load controls:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Apply filters
  const visibleControls = controls.filter(control => {
    const idMatch = 
      !controlIdFilter ||
      control.controlCode.toLowerCase().includes(controlIdFilter.toLowerCase())
    
    const statementMatch = 
      !statementFilter ||
      control.controlStatement.toLowerCase().includes(statementFilter.toLowerCase())

    return idMatch && statementMatch
  })

  const activeFilterCount = 
    (controlIdFilter !== "" ? 1 : 0) +
    (statementFilter !== "" ? 1 : 0)

  // Helper to get color based on average score
  const getScoreColor = (score: number) => {
    if (score >= 70) return "#22c55e"
    if (score >= 40) return "#f59e0b"
    return "#ef4444"
  }

  // Column sizing (expanded to include new columns)
  const idColWidth = 200
  const statementMinWidth = 480
  const typeColWidth = 120
  const compliantColWidth = 140
  const nonCompliantColWidth = 160
  const avgScoreColWidth = 120

  const gridTemplateColumns = `${idColWidth}px minmax(${statementMinWidth}px, 1fr) ${typeColWidth}px ${compliantColWidth}px ${nonCompliantColWidth}px ${avgScoreColWidth}px`
  const minGridWidth =
    idColWidth + statementMinWidth + typeColWidth + compliantColWidth + nonCompliantColWidth + avgScoreColWidth

  return (
    <div className="md3-card overflow-hidden">
      <div className="p-6 pb-4">
        <h2 className="text-2xl font-bold text-md-on-surface">
          Compliance by Domain
        </h2>
        <p className="mt-1 text-base text-md-on-surface-variant max-w-4xl">
          Following section gives an overview of number of applications on which
          specific controls which are compliant and/or non-compliant
        </p>
      </div>

      <div className="px-6 pb-6">
        {/* Filter Status Bar */}
        {activeFilterCount > 0 && (
          <div className="flex items-center justify-between rounded-xl border border-md-outline-variant bg-md-surface-container p-4 shadow-sm mb-4">
            <div className="text-sm text-md-on-surface-variant">
              {visibleControls.length} of {controls.length} controls
              {activeFilterCount > 0 && (
                <span className="ml-2 opacity-70">
                  • {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""} active
                </span>
              )}
            </div>
            <button
              onClick={() => {
                setControlIdFilter("")
                setStatementFilter("")
              }}
              className="text-sm text-md-primary font-medium hover:opacity-70 transition-opacity"
            >
              Clear all filters
            </button>
          </div>
        )}

        <div className="rounded-xl border border-md-outline-variant overflow-hidden shadow-sm">
          <div className="flex flex-col md:grid md:grid-cols-[240px_1fr]">
            {/* Left rail: domains */}
            <aside className="border-b md:border-b-0 md:border-r border-md-outline-variant bg-md-surface-container">
              <div
                className="h-12 px-4 flex items-center text-sm font-bold uppercase tracking-wider border-b border-md-outline-variant"
                style={{ backgroundColor: "var(--md-primary-container)", color: "var(--md-on-primary-container)" }}
              >
                Security Domains
              </div>

              <div className="p-2 space-y-2">
                {domains.map(domain => {
                  const isSelected = domain.name === selectedDomain
                  return (
                    <button
                      key={domain.id}
                      onClick={() => handleDomainClick(domain.name)}
                      className={[
                        "w-full rounded-md p-4 flex items-center justify-between transition-all duration-200 group text-left",
                        isSelected
                          ? "bg-md-primary-container text-md-on-primary-container shadow-sm"
                          : "bg-md-primary hover:opacity-80 text-md-on-primary",
                      ].join(" ")}
                    >
                      <div className="flex-1">
                        <div className="font-bold text-base">{domain.name}</div>
                        <div
                          className={[
                            "text-sm mt-0.5",
                            isSelected ? "text-md-on-primary-container/70" : "text-md-on-primary/70",
                          ].join(" ")}
                        >
                          {domain.controls} controls
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: getScoreColor(domain.avgCompliance) }}
                          />
                          <span
                            className={[
                              "text-xs font-semibold",
                              isSelected ? "text-md-on-primary-container" : "text-md-on-primary",
                            ].join(" ")}
                          >
                            {domain.avgCompliance}% avg
                          </span>
                        </div>
                      </div>

                      <svg
                        className={[
                          "w-5 h-5 transition-all duration-200 flex-shrink-0 ml-2",
                          isSelected
                            ? "text-md-on-primary-container"
                            : "text-md-on-primary/60 group-hover:text-md-on-primary group-hover:translate-x-1",
                        ].join(" ")}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  )
                })}
              </div>
            </aside>

            {/* Right: ONE scroll container for header + body */}
            <section className="min-w-0 bg-md-surface">
              <div className="max-h-[600px] overflow-auto">
                <div style={{ minWidth: minGridWidth }}>
                  {/* Sticky header inside same scroll container */}
                  <div
                    className="sticky top-0 z-10 border-b border-md-outline-variant"
                    style={{ backgroundColor: "var(--md-primary-container)" }}
                  >
                    <div className="grid" style={{ gridTemplateColumns }}>
                      <div className="h-12 px-4 flex items-center gap-2 font-bold text-md-on-primary-container">
                        <span>Control</span>
                        <FilterDropdown
                          label="Control ID"
                          value={controlIdFilter}
                          onChange={setControlIdFilter}
                          onClear={() => setControlIdFilter("")}
                        />
                      </div>
                      <div className="h-12 px-4 flex items-center gap-2 font-bold text-md-on-primary-container">
                        <span>Control Statement</span>
                        <FilterDropdown
                          label="Control Statement"
                          value={statementFilter}
                          onChange={setStatementFilter}
                          onClear={() => setStatementFilter("")}
                        />
                      </div>
                      <div className="h-12 px-4 flex items-center justify-center font-bold text-md-on-primary-container text-center">
                        Compliant
                      </div>
                      <div className="h-12 px-4 flex items-center justify-center font-bold text-md-on-primary-container text-center">
                        Non-Compliant
                      </div>
                      <div className="h-12 px-4 flex items-center justify-center font-bold text-md-on-primary-container text-center">
                        Avg Score
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  {isLoading ? (
                    <div className="p-6">
                      <div className="flex flex-col items-center justify-center bg-md-surface-container rounded-xl p-12 border border-md-outline-variant">
                        <div className="w-12 h-12 border-4 border-md-primary-container border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="text-base font-bold text-md-on-surface">
                          Loading controls...
                        </p>
                      </div>
                    </div>
                  ) : visibleControls.length === 0 ? (
                    <div className="p-6">
                      <div className="flex flex-col items-center justify-center bg-md-surface-container rounded-xl p-12 border border-md-outline-variant">
                        <div className="w-16 h-16 bg-md-surface rounded-full flex items-center justify-center mb-4 border border-md-outline-variant">
                          <svg
                            className="w-8 h-8 text-md-on-surface-variant"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        </div>
                        <p className="text-base font-bold text-md-on-surface">
                          {activeFilterCount > 0 ? "No controls match your filters" : "No controls found"}
                        </p>
                        <p className="text-sm text-md-on-surface-variant mt-2">
                          {activeFilterCount > 0 
                            ? "Try adjusting your filter criteria"
                            : "This domain has no controls defined"}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {visibleControls.map(control => (
                        <div
                          key={control.id}
                          className="border-b border-md-outline-variant last:border-b-0 hover:bg-md-surface-container transition-colors"
                        >
                          <div className="grid" style={{ gridTemplateColumns }}>
                            {/* Control ID */}
                            <div className="px-4 py-4 align-top">
                              <div className="font-bold text-sm text-md-on-surface">
                                {control.controlCode}
                              </div>
                              {control.subDomain && (
                                <div className="text-xs text-md-on-surface-variant mt-1">
                                  {control.subDomain}
                                </div>
                              )}
                              {control.isAutomated && (
                                <div className="mt-1">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-md-primary-container/30 text-md-on-surface">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    Auto
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Statement */}
                            <div className="px-4 py-4 align-top">
                              <div className="text-sm text-md-on-surface leading-relaxed">
                                {control.controlStatement}
                              </div>
                            </div>

                            {/* Compliant */}
                            <div className="px-4 py-4 flex items-center justify-center">
                              <div className="flex items-center justify-center gap-2">
                                <svg
                                  className="w-4 h-4 text-[#00a758] flex-shrink-0"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                                <span className="text-lg font-bold text-md-on-surface">
                                  {control.compliantApps}
                                </span>
                              </div>
                            </div>

                            {/* Non-compliant */}
                            <div className="px-4 py-4 flex items-center justify-center">
                              <div className="flex items-center justify-center gap-2">
                                <svg
                                  className="w-4 h-4 text-[#e41f13] flex-shrink-0"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                  />
                                </svg>
                                <span className="text-lg font-bold text-md-on-surface">
                                  {control.nonCompliantApps}
                                </span>
                              </div>
                            </div>

                            {/* Average Score */}
                            <div className="px-4 py-4 flex items-center justify-center">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: getScoreColor(control.avgScore) }}
                                />
                                <span className="text-base font-bold text-md-on-surface">
                                  {control.avgScore}%
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}