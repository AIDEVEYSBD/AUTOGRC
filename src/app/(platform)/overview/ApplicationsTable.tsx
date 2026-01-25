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
        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-600">
            {visibleRows.length} of {matrix.rows.length} applications
            {activeFilterCount > 0 && (
              <span className="ml-2 text-gray-500">
                • 1 filter active
              </span>
            )}
          </div>
          <button
            onClick={() => setApplicationFilter("")}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Clear filter
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200">
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
          <table className="w-full text-sm">
            <thead className="sticky top-0 border-b border-slate-300 z-10" style={{ backgroundColor: '#ffe600' }}>
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-900" style={{ backgroundColor: '#ffe600' }}>
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
                    className="px-4 py-3 text-center font-semibold text-slate-900 min-w-[100px]"
                    style={{ backgroundColor: '#ffe600' }}
                  >
                    {fw.name}
                  </th>
                ))}
                <th className="px-4 py-3 text-center font-semibold text-slate-900 min-w-[100px]" style={{ backgroundColor: '#ffe600' }}>
                  Overall
                </th>
              </tr>
            </thead>

            <tbody>
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={matrix.frameworks.length + 2} className="px-4 py-8 text-center text-sm text-slate-600">
                    {activeFilterCount > 0
                      ? "No applications match your filters."
                      : "No applications found."}
                  </td>
                </tr>
              ) : (
                visibleRows.map(app => (
                  <tr
                    key={app.id}
                    className="border-b border-slate-200 hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-4 bg-white sticky left-0">
                      <div className="font-semibold text-slate-900">
                        {app.name}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
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
                              <span className="text-base font-semibold text-slate-900">
                                {cell.percent}%
                              </span>
                            </div>
                            <div className="text-xs text-slate-500">
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
                          <span className="text-base font-semibold text-slate-900">
                            {app.overallScore}%
                          </span>
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