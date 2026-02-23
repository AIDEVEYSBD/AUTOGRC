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
        className={`p-1 rounded hover:bg-gray-900/10 transition-colors ${
          value ? "text-blue-600" : "text-gray-600"
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
          <div className="absolute top-full left-0 mt-2 z-20 bg-white rounded-lg border border-gray-200 shadow-lg p-3 min-w-[250px]">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={`Filter ${label.toLowerCase()}...`}
                className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-200"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
              {value && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onClear()
                  }}
                  className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
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
    <div className="rounded-lg border border-[#cccccc] bg-white shadow-sm overflow-hidden">
      <div className="p-6 pb-4">
        <h2 className="text-2xl font-bold text-[#333333]">
          Compliance by Domain
        </h2>
        <p className="mt-1 text-base text-[#666666] max-w-4xl">
          Following section gives an overview of number of applications on which
          specific controls which are compliant and/or non-compliant
        </p>
      </div>

      <div className="px-6 pb-6">
        {/* Filter Status Bar */}
        {activeFilterCount > 0 && (
          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm mb-4">
            <div className="text-sm text-gray-600">
              {visibleControls.length} of {controls.length} controls
              {activeFilterCount > 0 && (
                <span className="ml-2 text-gray-500">
                  • {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""} active
                </span>
              )}
            </div>
            <button
              onClick={() => {
                setControlIdFilter("")
                setStatementFilter("")
              }}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear all filters
            </button>
          </div>
        )}

        <div className="rounded-lg border border-[#cccccc] bg-white shadow-sm overflow-hidden">
          <div className="flex flex-col md:grid md:grid-cols-[240px_1fr]">
            {/* Left rail: domains */}
            <aside className="border-b md:border-b-0 md:border-r border-[#cccccc] bg-[#f9f9f9]">
              <div
                className="h-12 px-4 flex items-center text-sm font-bold uppercase tracking-wider text-[#333333] border-b border-[#cccccc]"
                style={{ backgroundColor: "#ffe600" }}
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
                          ? "bg-[#ffe600] text-[#333333] shadow-sm"
                          : "bg-[#2e2e38] hover:bg-[#3e3e48] text-white",
                      ].join(" ")}
                    >
                      <div className="flex-1">
                        <div className="font-bold text-base">{domain.name}</div>
                        <div
                          className={[
                            "text-sm mt-0.5",
                            isSelected ? "text-[#666666]" : "text-[#cccccc]",
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
                              isSelected ? "text-[#333333]" : "text-white",
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
                            ? "text-[#333333]"
                            : "text-[#cccccc] group-hover:text-white group-hover:translate-x-1",
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
            <section className="min-w-0 bg-white">
              <div className="max-h-[600px] overflow-auto">
                <div style={{ minWidth: minGridWidth }}>
                  {/* Sticky header inside same scroll container */}
                  <div
                    className="sticky top-0 z-10 border-b border-[#cccccc]"
                    style={{ backgroundColor: "#ffe600" }}
                  >
                    <div className="grid" style={{ gridTemplateColumns }}>
                      <div className="h-12 px-4 flex items-center gap-2 font-bold text-[#333333]">
                        <span>Control</span>
                        <FilterDropdown
                          label="Control ID"
                          value={controlIdFilter}
                          onChange={setControlIdFilter}
                          onClear={() => setControlIdFilter("")}
                        />
                      </div>
                      <div className="h-12 px-4 flex items-center gap-2 font-bold text-[#333333]">
                        <span>Control Statement</span>
                        <FilterDropdown
                          label="Control Statement"
                          value={statementFilter}
                          onChange={setStatementFilter}
                          onClear={() => setStatementFilter("")}
                        />
                      </div>
                      <div className="h-12 px-4 flex items-center justify-center font-bold text-[#333333] text-center">
                        Compliant
                      </div>
                      <div className="h-12 px-4 flex items-center justify-center font-bold text-[#333333] text-center">
                        Non-Compliant
                      </div>
                      <div className="h-12 px-4 flex items-center justify-center font-bold text-[#333333] text-center">
                        Avg Score
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  {isLoading ? (
                    <div className="p-6">
                      <div className="flex flex-col items-center justify-center bg-[#f9f9f9] rounded p-12 border border-[#cccccc]">
                        <div className="w-12 h-12 border-4 border-[#ffe600] border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="text-base font-bold text-[#333333]">
                          Loading controls...
                        </p>
                      </div>
                    </div>
                  ) : visibleControls.length === 0 ? (
                    <div className="p-6">
                      <div className="flex flex-col items-center justify-center bg-[#f9f9f9] rounded p-12 border border-[#cccccc]">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 border border-[#cccccc]">
                          <svg
                            className="w-8 h-8 text-[#999999]"
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
                        <p className="text-base font-bold text-[#333333]">
                          {activeFilterCount > 0 ? "No controls match your filters" : "No controls found"}
                        </p>
                        <p className="text-sm text-[#666666] mt-2">
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
                          className="border-b border-[#e5e7eb] last:border-b-0 hover:bg-[#f9f9f9] transition-colors"
                        >
                          <div className="grid" style={{ gridTemplateColumns }}>
                            {/* Control ID */}
                            <div className="px-4 py-4 align-top">
                              <div className="font-bold text-sm text-[#333333]">
                                {control.controlCode}
                              </div>
                              {control.subDomain && (
                                <div className="text-xs text-[#666666] mt-1">
                                  {control.subDomain}
                                </div>
                              )}
                              {control.isAutomated && (
                                <div className="mt-1">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
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
                              <div className="text-sm text-[#333333] leading-relaxed">
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
                                <span className="text-lg font-bold text-[#333333]">
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
                                <span className="text-lg font-bold text-[#333333]">
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
                                <span className="text-base font-bold text-[#333333]">
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