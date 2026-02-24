"use client"

import { useState } from "react"

type ApplicationsMatrixData = {
  frameworks: { id: string; name: string }[]
  rows: {
    id: string
    name: string
    owner: string
    overallScore: number
    byFramework: Record<string, { percent: number; done: number; total: number }>
  }[]
}

function ringColor(p: number) {
  if (p >= 70) return "#22c55e"
  if (p >= 40) return "#f59e0b"
  return "#ef4444"
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

export function ApplicationsTable({ matrix }: { matrix: ApplicationsMatrixData }) {
  const [applicationFilter, setApplicationFilter] = useState("")

  // Apply filters
  const visibleRows = matrix.rows.filter(app => {
    // Application filter (name or owner)
    return (
      !applicationFilter ||
      app.name.toLowerCase().includes(applicationFilter.toLowerCase()) ||
      app.owner.toLowerCase().includes(applicationFilter.toLowerCase())
    )
  })

  const activeFilterCount = applicationFilter !== "" ? 1 : 0

  return (
    <div className="space-y-4">
      {/* Filter Status Bar */}
      {activeFilterCount > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-md-outline-variant bg-md-surface-container p-4 shadow-sm">
          <div className="text-sm text-md-on-surface-variant">
            {visibleRows.length} of {matrix.rows.length} applications
            {activeFilterCount > 0 && (
              <span className="ml-2 opacity-70">
                • 1 filter active
              </span>
            )}
          </div>
          <button
            onClick={() => setApplicationFilter("")}
            className="text-sm text-md-primary font-medium hover:opacity-70 transition-opacity"
          >
            Clear filter
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-md-outline-variant">
        <div 
          className={matrix.rows.length > 10 ? "max-h-[520px] overflow-y-auto" : ""}
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <style dangerouslySetInnerHTML={{
            __html: `
              .overflow-y-auto::-webkit-scrollbar {
                display: none;
              }
            `
          }} />
          <table className="w-full min-w-[600px] text-sm">
            <thead className="sticky top-0 border-b border-md-outline-variant z-10" style={{ backgroundColor: 'var(--md-primary-container)' }}>
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-md-on-primary-container" style={{ backgroundColor: 'var(--md-primary-container)' }}>
                  <div className="flex items-center gap-2">
                    <span>Application</span>
                    <FilterDropdown
                      label="Application"
                      value={applicationFilter}
                      onChange={setApplicationFilter}
                      onClear={() => setApplicationFilter("")}
                    />
                  </div>
                </th>
                {matrix.frameworks.map(fw => (
                  <th
                    key={fw.id}
                    className="px-4 py-3 text-center font-semibold text-md-on-primary-container min-w-[100px]"
                    style={{ backgroundColor: 'var(--md-primary-container)' }}
                  >
                    {fw.name}
                  </th>
                ))}
                <th className="px-4 py-3 text-center font-semibold text-md-on-primary-container min-w-[100px]" style={{ backgroundColor: 'var(--md-primary-container)' }}>
                  Overall
                </th>
              </tr>
            </thead>

            <tbody>
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={matrix.frameworks.length + 2} className="px-4 py-8 text-center text-sm text-md-on-surface-variant">
                    {activeFilterCount > 0
                      ? "No applications match your filters."
                      : "No applications found."}
                  </td>
                </tr>
              ) : (
                visibleRows.map(app => (
                  <tr
                    key={app.id}
                    className="border-b border-md-outline-variant hover:bg-md-surface-container transition-colors"
                  >
                    <td className="px-4 py-4 bg-md-surface sticky left-0">
                      <div className="font-semibold text-md-on-surface">
                        {app.name}
                      </div>
                      <div className="text-xs text-md-on-surface-variant mt-1">
                        {app.owner}
                      </div>
                    </td>

                    {matrix.frameworks.map(fw => {
                      const cell = app.byFramework[fw.id]
                      const dotColor = ringColor(cell.percent)
                      return (
                        <td
                          key={fw.id}
                          className="px-4 py-4 text-center align-middle"
                        >
                          <div className="flex flex-col items-center justify-center gap-2">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: dotColor }}
                              />
                              <span className="text-base font-semibold text-md-on-surface">
                                {cell.percent}%
                              </span>
                            </div>
                            <div className="text-xs text-md-on-surface-variant">
                              {cell.done}/{cell.total} controls
                            </div>
                          </div>
                        </td>
                      )
                    })}

                    <td className="px-4 py-4 text-center align-middle">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: ringColor(app.overallScore) }}
                          />
                          <span className="text-base font-semibold text-md-on-surface">
                            {app.overallScore}%
                          </span>
                        </div>
                        <div className="text-xs text-md-on-surface-variant">
                          aggregate score
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}