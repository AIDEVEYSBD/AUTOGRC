"use client"

import { useState } from "react"
import type { ControlAssessmentRow, EvidenceRow } from "@/lib/application-detail.queries"

type SortKey = "controlCode" | "domain" | "complianceScore" | "status"

export default function ControlsTable({
  controls,
}: {
  controls: ControlAssessmentRow[]
}) {
  const [sortKey, setSortKey] = useState<SortKey>("controlCode")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [expandedId, setExpandedId] = useState<string | null>(null)

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  const sorted = [...controls].sort((a, b) => {
    const av = a[sortKey]
    const bv = b[sortKey]
    if (av < bv) return sortDir === "asc" ? -1 : 1
    if (av > bv) return sortDir === "asc" ? 1 : -1
    return 0
  })

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="max-h-[600px] overflow-y-auto scrollbar-hide">
        <style jsx>{`
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}</style>
        <table className="w-full text-sm table-fixed">
          <thead className="sticky top-0 bg-[#FFE600] border-b border-gray-200 z-10">
            <tr>
              <Th
                onClick={() => toggleSort("controlCode")}
                isActive={sortKey === "controlCode"}
                sortDir={sortKey === "controlCode" ? sortDir : undefined}
                width="w-28"
              >
                Control ID
              </Th>
              <Th
                onClick={() => toggleSort("domain")}
                isActive={sortKey === "domain"}
                sortDir={sortKey === "domain" ? sortDir : undefined}
                width="w-36"
              >
                Domain
              </Th>
              <Th width="flex-1">Control Statement</Th>
              <Th
                onClick={() => toggleSort("status")}
                isActive={sortKey === "status"}
                sortDir={sortKey === "status" ? sortDir : undefined}
                width="w-32"
              >
                Status
              </Th>
              <Th
                onClick={() => toggleSort("complianceScore")}
                isActive={sortKey === "complianceScore"}
                sortDir={sortKey === "complianceScore" ? sortDir : undefined}
                width="w-24"
              >
                Score
              </Th>
              <Th width="w-28">Evidence</Th>
              <th className="w-12"></th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {sorted.map(c => (
              <>
                <tr
                  key={c.id}
                  onClick={() =>
                    setExpandedId(expandedId === c.id ? null : c.id)
                  }
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <Td className="font-semibold text-gray-900">
                    {c.controlCode}
                  </Td>
                  <Td>
                    <div className="space-y-1">
                      <div className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                        {c.domain}
                      </div>
                      {c.subDomain && (
                        <div className="text-xs text-gray-500">
                          {c.subDomain}
                        </div>
                      )}
                    </div>
                  </Td>
                  <Td>
                    <div className="text-gray-700 leading-relaxed">
                      {c.controlStatement}
                    </div>
                  </Td>
                  <Td>
                    <StatusBadge status={c.status} />
                  </Td>
                  <Td>
                    <ScoreBadge score={c.complianceScore} />
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1">
                      <span className="inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-700">
                        {c.evidence.length}
                      </span>
                    </div>
                  </Td>
                  <Td className="text-right">
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${
                        expandedId === c.id ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </Td>
                </tr>

                {expandedId === c.id && (
                  <tr className="bg-gray-50">
                    <Td colSpan={7} className="p-6">
                      <div className="space-y-6 max-w-6xl">
                        {/* Testing Procedure */}
                        {c.testingProcedure && (
                          <div className="bg-white rounded-lg border border-gray-200 p-4">
                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                              Testing Procedure
                            </div>
                            <p className="text-sm text-gray-700 leading-relaxed">
                              {c.testingProcedure}
                            </p>
                          </div>
                        )}

                        {/* Evidence Section */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                              Evidence ({c.evidence.length})
                            </div>
                            <div className="text-xs text-gray-500">
                              Assessed by: {c.assessedBy}
                            </div>
                          </div>

                          {c.evidence.length === 0 ? (
                            <div className="bg-white rounded-lg border border-gray-200 p-4 text-center text-sm text-gray-500">
                              No evidence available for this control
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {c.evidence.map(ev => (
                                <EvidenceCard key={ev.id} evidence={ev} />
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Assessment Info */}
                        <div className="flex items-center gap-6 text-xs text-gray-500 pt-4 border-t border-gray-200">
                          <div className="flex items-center gap-2">
                            <span>Assessed:</span>
                            <span className="font-medium text-gray-900">
                              {new Date(c.assessedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ───────────────────────────────────────────── */

function EvidenceCard({ evidence }: { evidence: EvidenceRow }) {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Evidence Header */}
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <SourceTypeBadge sourceType={evidence.sourceType} />
              <StatusBadge status={evidence.status} />
              <ScoreBadge score={evidence.score} />
            </div>
            <div className="font-medium text-gray-900 text-sm">
              {evidence.title}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Collected:{" "}
              {new Date(evidence.collectedAt).toLocaleDateString()} at{" "}
              {new Date(evidence.collectedAt).toLocaleTimeString()}
            </div>
          </div>
          {(evidence.explanation || evidence.evidenceData) && (
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              {showDetails ? "Hide Details" : "Show Details"}
            </button>
          )}
        </div>
      </div>

      {/* Evidence Details (Expandable) */}
      {showDetails && (
        <div className="p-4 space-y-4">
          {evidence.explanation && (
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Explanation
              </div>
              <div className="text-sm text-gray-700 leading-relaxed">
                {evidence.explanation}
              </div>
            </div>
          )}

          {evidence.evidenceData && (
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Evidence Data
              </div>
              <div className="bg-gray-50 rounded p-3 border border-gray-200">
                <pre className="text-xs text-gray-700 overflow-x-auto">
                  {JSON.stringify(evidence.evidenceData, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {(evidence.integrationRunId || evidence.socRunId) && (
            <div className="flex items-center gap-4 text-xs text-gray-500 pt-2 border-t border-gray-200">
              {evidence.integrationRunId && (
                <div>
                  <span className="font-medium">Integration Run: </span>
                  <span className="font-mono">
                    {evidence.integrationRunId.slice(0, 8)}...
                  </span>
                </div>
              )}
              {evidence.socRunId && (
                <div>
                  <span className="font-medium">SOC Run: </span>
                  <span className="font-mono">
                    {evidence.socRunId.slice(0, 8)}...
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SourceTypeBadge({
  sourceType,
}: {
  sourceType: "Automation" | "SOC Report" | "Manual Testing"
}) {
  const variants = {
    Automation: {
      label: "Automated",
      className: "bg-purple-50 text-purple-700 border-purple-200",
    },
    "SOC Report": {
      label: "SOC Report",
      className: "bg-blue-50 text-blue-700 border-blue-200",
    },
    "Manual Testing": {
      label: "Manual",
      className: "bg-gray-50 text-gray-700 border-gray-200",
    },
  }

  const variant = variants[sourceType]

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${variant.className}`}
    >
      {variant.label}
    </span>
  )
}

function ScoreBadge({ score }: { score: number }) {
  const getScoreColor = (s: number) => {
    if (s >= 90) return "bg-green-100 text-green-800 border-green-200"
    if (s >= 70) return "bg-amber-100 text-amber-800 border-amber-200"
    return "bg-red-100 text-red-800 border-red-200"
  }

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${getScoreColor(
        score
      )}`}
    >
      {score}%
    </span>
  )
}

function StatusBadge({
  status,
}: {
  status: "Compliant" | "Not Compliant" | "Partial Gap" | "Not Applicable"
}) {
  const variants = {
    Compliant: "bg-green-100 text-green-800 border-green-200",
    "Partial Gap": "bg-amber-100 text-amber-800 border-amber-200",
    "Not Compliant": "bg-red-100 text-red-800 border-red-200",
    "Not Applicable": "bg-gray-100 text-gray-800 border-gray-200",
  }

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium whitespace-nowrap ${variants[status]}`}
    >
      {status}
    </span>
  )
}

function Th({
  children,
  onClick,
  isActive,
  sortDir,
  width,
}: {
  children: React.ReactNode
  onClick?: () => void
  isActive?: boolean
  sortDir?: "asc" | "desc"
  width?: string
}) {
  return (
    <th
      onClick={onClick}
      className={`${
        width || ""
      } px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider transition-colors ${
        onClick ? "cursor-pointer select-none" : ""
      } ${isActive ? "text-gray-900" : "text-gray-700"} ${
        onClick ? "hover:text-gray-900" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        {children}
        {onClick && (
          <svg
            className={`w-4 h-4 transition-all ${
              isActive ? "text-gray-900" : "text-gray-600"
            } ${sortDir === "desc" ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 11l5-5m0 0l5 5m-5-5v12"
            />
          </svg>
        )}
      </div>
    </th>
  )
}

function Td({
  children,
  className,
  colSpan,
}: {
  children: React.ReactNode
  className?: string
  colSpan?: number
}) {
  return (
    <td
      colSpan={colSpan}
      className={`px-4 py-3.5 text-gray-600 ${className ?? ""}`}
    >
      {children}
    </td>
  )
}