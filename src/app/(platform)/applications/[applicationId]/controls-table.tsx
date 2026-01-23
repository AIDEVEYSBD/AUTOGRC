"use client"

import { useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
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
    // First priority: assessed controls always come before unassessed
    if (a.isAssessed && !b.isAssessed) return -1
    if (!a.isAssessed && b.isAssessed) return 1
    
    // Second priority: sort by selected column within each group
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
                  key={c.controlId}
                  onClick={() => {
                    // Only allow expansion for assessed controls
                    if (c.isAssessed) {
                      setExpandedId(expandedId === c.controlId ? null : c.controlId)
                    }
                  }}
                  className={`transition-colors ${
                    c.isAssessed 
                      ? "cursor-pointer hover:bg-gray-50" 
                      : "cursor-not-allowed bg-gray-50 opacity-60"
                  }`}
                >
                  <Td className={`font-semibold ${c.isAssessed ? "text-gray-900" : "text-gray-500"}`}>
                    {c.controlCode}
                  </Td>
                  <Td>
                    <div className="space-y-1">
                      <div className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                        c.isAssessed ? "bg-gray-100 text-gray-700" : "bg-gray-200 text-gray-500"
                      }`}>
                        {c.domain}
                      </div>
                      {c.subDomain && (
                        <div className={`text-xs ${c.isAssessed ? "text-gray-500" : "text-gray-400"}`}>
                          {c.subDomain}
                        </div>
                      )}
                    </div>
                  </Td>
                  <Td>
                    <div className={`leading-relaxed ${c.isAssessed ? "text-gray-700" : "text-gray-500"}`}>
                      {c.controlStatement}
                    </div>
                  </Td>
                  <Td>
                    {c.isAssessed ? (
                      <ScoreBadge score={c.complianceScore} />
                    ) : (
                      <span className="inline-flex items-center rounded-md border border-gray-300 bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-500">
                        N/A
                      </span>
                    )}
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1">
                      <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${
                        c.isAssessed 
                          ? "border-gray-200 bg-gray-50 text-gray-700" 
                          : "border-gray-300 bg-gray-200 text-gray-400"
                      }`}>
                        {c.evidence.length}
                      </span>
                    </div>
                  </Td>
                  <Td className="text-right">
                    {c.isAssessed ? (
                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform ${
                          expandedId === c.controlId ? "rotate-180" : ""
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
                    ) : (
                      <svg
                        className="w-5 h-5 text-gray-300"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                        />
                      </svg>
                    )}
                  </Td>
                </tr>

                {expandedId === c.controlId && c.isAssessed && (
                  <tr className="bg-gray-50">
                    <Td colSpan={6} className="p-6">
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
                        {c.assessedAt && (
                          <div className="flex items-center gap-6 text-xs text-gray-500 pt-4 border-t border-gray-200">
                            <div className="flex items-center gap-2">
                              <span>Assessed:</span>
                              <span className="font-medium text-gray-900">
                                {new Date(c.assessedAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        )}
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
              <StatusBadge status={evidence.status} isAssessed={true} />
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
              <div className="prose prose-sm max-w-none text-gray-700">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                    li: ({ children }) => <li className="ml-2">{children}</li>,
                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                    em: ({ children }) => <em className="italic">{children}</em>,
                    code: ({ children }) => (
                      <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">
                        {children}
                      </code>
                    ),
                    pre: ({ children }) => (
                      <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto mb-2">
                        {children}
                      </pre>
                    ),
                    h1: ({ children }) => <h1 className="text-base font-semibold mb-2">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-sm font-semibold mb-2">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-sm font-medium mb-1">{children}</h3>,
                    a: ({ children, href }) => (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        {children}
                      </a>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-gray-300 pl-3 italic text-gray-600 mb-2">
                        {children}
                      </blockquote>
                    ),
                  }}
                >
                  {evidence.explanation}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {evidence.evidenceData && (
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Evidence Data
              </div>
              <div className="bg-gray-50 rounded p-3 border border-gray-200 overflow-x-auto">
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      table: ({ children }) => (
                        <table className="min-w-full divide-y divide-gray-300 border border-gray-300">
                          {children}
                        </table>
                      ),
                      thead: ({ children }) => (
                        <thead className="bg-gray-100">
                          {children}
                        </thead>
                      ),
                      tbody: ({ children }) => (
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {children}
                        </tbody>
                      ),
                      tr: ({ children }) => (
                        <tr>
                          {children}
                        </tr>
                      ),
                      th: ({ children }) => (
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 border-r border-gray-300 last:border-r-0">
                          {children}
                        </th>
                      ),
                      td: ({ children }) => (
                        <td className="px-3 py-2 text-xs text-gray-700 border-r border-gray-200 last:border-r-0">
                          {children}
                        </td>
                      ),
                      p: ({ children }) => <p className="mb-2 last:mb-0 text-xs">{children}</p>,
                      code: ({ children }) => (
                        <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">
                          {children}
                        </code>
                      ),
                      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                      em: ({ children }) => <em className="italic">{children}</em>,
                    }}
                  >
                    {evidence.evidenceData}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          )}

          {(evidence.automationRunId || evidence.socRunId) && (
            <div className="flex items-center gap-4 text-xs text-gray-500 pt-2 border-t border-gray-200">
              {evidence.automationRunId && (
                <div>
                  <span className="font-medium">Automation Run: </span>
                  <span className="font-mono">
                    {evidence.automationRunId.slice(0, 8)}...
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
  isAssessed,
}: {
  status: "Compliant" | "Not Compliant" | "Partial Gap" | "Not Applicable" | "Not Assessed"
  isAssessed: boolean
}) {
  const variants = {
    Compliant: "bg-green-100 text-green-800 border-green-200",
    "Partial Gap": "bg-amber-100 text-amber-800 border-amber-200",
    "Not Compliant": "bg-red-100 text-red-800 border-red-200",
    "Not Applicable": "bg-gray-100 text-gray-800 border-gray-200",
    "Not Assessed": "bg-gray-200 text-gray-500 border-gray-300",
  }

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium whitespace-nowrap ${
        isAssessed ? variants[status] : "bg-gray-200 text-gray-500 border-gray-300"
      }`}
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