"use client"

import { useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { ControlAssessmentRow, EvidenceRow } from "@/lib/application-detail.queries"

type SortKey = "controlCode" | "domain" | "complianceScore" | "status"

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

export default function ControlsTable({
  controls,
}: {
  controls: ControlAssessmentRow[]
}) {
  const [sortKey, setSortKey] = useState<SortKey>("controlCode")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [controlIdFilter, setControlIdFilter] = useState("")
  const [domainFilter, setDomainFilter] = useState("")
  const [statementFilter, setStatementFilter] = useState("")

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  // Apply filters
  const filtered = controls.filter(control => {
    const idMatch = 
      !controlIdFilter ||
      control.controlCode.toLowerCase().includes(controlIdFilter.toLowerCase())
    
    const domainMatch = 
      !domainFilter ||
      control.domain.toLowerCase().includes(domainFilter.toLowerCase()) ||
      (control.subDomain && control.subDomain.toLowerCase().includes(domainFilter.toLowerCase()))
    
    const statementMatch = 
      !statementFilter ||
      control.controlStatement.toLowerCase().includes(statementFilter.toLowerCase())

    return idMatch && domainMatch && statementMatch
  })

  const sorted = [...filtered].sort((a, b) => {
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

  const activeFilterCount = 
    (controlIdFilter !== "" ? 1 : 0) +
    (domainFilter !== "" ? 1 : 0) +
    (statementFilter !== "" ? 1 : 0)

  return (
    <div className="space-y-4">
      {/* Filter Status Bar */}
      {activeFilterCount > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-600">
            {sorted.length} of {controls.length} controls
            {activeFilterCount > 0 && (
              <span className="ml-2 text-gray-500">
                • {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""} active
              </span>
            )}
          </div>
          <button
            onClick={() => {
              setControlIdFilter("")
              setDomainFilter("")
              setStatementFilter("")
            }}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Clear all filters
          </button>
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="max-h-[600px] overflow-y-auto">
          <table className="w-full text-sm table-fixed">
            <thead className="sticky top-0 bg-[#FFE600] border-b border-gray-200 z-10">
              <tr>
                <Th
                  onClick={() => toggleSort("controlCode")}
                  isActive={sortKey === "controlCode"}
                  sortDir={sortKey === "controlCode" ? sortDir : undefined}
                  width="w-28"
                >
                  <div className="flex items-center gap-2">
                    <span>Control ID</span>
                    <FilterDropdown
                      label="Control ID"
                      value={controlIdFilter}
                      onChange={setControlIdFilter}
                      onClear={() => setControlIdFilter("")}
                    />
                  </div>
                </Th>
                <Th
                  onClick={() => toggleSort("domain")}
                  isActive={sortKey === "domain"}
                  sortDir={sortKey === "domain" ? sortDir : undefined}
                  width="w-36"
                >
                  <div className="flex items-center gap-2">
                    <span>Domain</span>
                    <FilterDropdown
                      label="Domain"
                      value={domainFilter}
                      onChange={setDomainFilter}
                      onClear={() => setDomainFilter("")}
                    />
                  </div>
                </Th>
                <Th width="flex-1">
                  <div className="flex items-center gap-2">
                    <span>Control Statement</span>
                    <FilterDropdown
                      label="Control Statement"
                      value={statementFilter}
                      onChange={setStatementFilter}
                      onClear={() => setStatementFilter("")}
                    />
                  </div>
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
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <svg
                          className="w-8 h-8 text-gray-400"
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
                      <p className="text-base font-semibold text-gray-900">
                        {activeFilterCount > 0 ? "No controls match your filters" : "No controls found"}
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        {activeFilterCount > 0 
                          ? "Try adjusting your filter criteria"
                          : "No controls available for this application"}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                sorted.map(c => (
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ───────────────────────────────────────────── */

function formatSOCExplanation(text: string): string {
  // First, fix character encoding issues with specific replacements
  let formatted = text
    // Fix specific common compound words - match any non-letter characters between words
    .replace(/real[^a-z]+time/gi, "real-time")
    .replace(/anti[^a-z]+malware/gi, "anti-malware")
    .replace(/network[^a-z]+based/gi, "network-based")
    .replace(/multi[^a-z]+factor/gi, "multi-factor")
    .replace(/two[^a-z]+factor/gi, "two-factor")
    .replace(/end[^a-z]+to[^a-z]+end/gi, "end-to-end")
    .replace(/up[^a-z]+to[^a-z]+date/gi, "up-to-date")
    .replace(/third[^a-z]+party/gi, "third-party")
    .replace(/host[^a-z]+based/gi, "host-based")
    .replace(/cloud[^a-z]+based/gi, "cloud-based")
    .replace(/risk[^a-z]+based/gi, "risk-based")
    .replace(/role[^a-z]+based/gi, "role-based")
    // Fix other encoding issues
    .replace(/Â /g, " ")
    .replace(/â„¢/g, "™")
    .replace(/Â©/g, "©")
    .replace(/Â®/g, "®")
  
  // Replace Framework A and Framework B
  formatted = formatted
    .replace(/Framework A/g, "Master Framework Name")
    .replace(/Framework B/g, "SOC 2 Type 2 Report")
  
  // Remove TSC and CC references (e.g., "TSC CC6.1", "CC6", "CC6.6")
  formatted = formatted
    .replace(/\bTSC\s+CC\d+\.?\d*\b/gi, "")
    .replace(/\bCC\d+\.?\d*\b/gi, "")
  
  // Clean up extra spaces, commas, and punctuation left behind
  formatted = formatted
    .replace(/\s+,/g, ",")           // Remove space before comma
    .replace(/,\s*,/g, ",")          // Remove duplicate commas
    .replace(/\s{2,}/g, " ")         // Replace multiple spaces with single space
    .replace(/,\s*;/g, ";")          // Clean up comma-semicolon combinations
    .replace(/;\s*,/g, ";")          // Clean up semicolon-comma combinations
    .replace(/\s+\./g, ".")          // Remove space before period
    .replace(/\(\s*\)/g, "")         // Remove empty parentheses
    .replace(/\[\s*\]/g, "")         // Remove empty brackets
    .trim()
  
  // Bold the section headers and add line breaks for paragraph separation
  const headers = [
    "Shared Concepts:",
    "Gaps Identified:",
    "Analyst Notes:",
    "Audit Notes:",
    "Both controls",
    "SOC Evidence:",
    "Policy Gaps:",
    "Implementation Gaps:",
    "Coverage:",
  ]
  
  headers.forEach(header => {
    // Escape special regex characters in the header
    const escapedHeader = header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // Add double line break before header and make it bold
    const regex = new RegExp(`(\\S)(\\s*)(${escapedHeader})`, "gi")
    formatted = formatted.replace(regex, "$1\n\n**$3**")
  })
  
  return formatted
}

function cleanOCRText(text: string): string {
  let cleaned = text
  
  // Remove @ symbols that appear to be OCR artifacts
  cleaned = cleaned.replace(/@/g, '')
  
  // Remove single isolated letters that appear between words (OCR artifacts)
  // Look for patterns like " a " or " h " where single letters appear alone
  cleaned = cleaned.replace(/\s+[a-z]\s+(?=[a-z])/gi, ' ')
  
  // Clean up multiple spaces
  cleaned = cleaned.replace(/\s{2,}/g, ' ')
  
  // Add line breaks after periods followed by capital letters (sentence boundaries)
  cleaned = cleaned.replace(/\.\s+([A-Z])/g, '.\n\n$1')
  
  // Add line breaks after "noted." which seems to be a common pattern
  cleaned = cleaned.replace(/noted\.\s+/gi, 'noted.\n\n')
  
  // Add line breaks before "No deviations" patterns
  cleaned = cleaned.replace(/\s+(No deviations)/gi, '\n\n$1')
  
  // Clean up any leading/trailing whitespace
  cleaned = cleaned.trim()
  
  return cleaned
}

function formatFieldName(key: string): string {
  // Convert snake_case to Title Case
  return key
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function parseSOCEvidenceData(jsonString: string): { key: string; value: string; cleanedValue: string }[] | null {
  try {
    const data = JSON.parse(jsonString)
    if (typeof data !== "object" || data === null) return null
    
    return Object.entries(data).map(([key, value]) => {
      const stringValue = String(value)
      return {
        key: formatFieldName(key),
        value: stringValue,
        cleanedValue: cleanOCRText(stringValue),
      }
    })
  } catch {
    return null
  }
}

function EvidenceCard({ evidence }: { evidence: EvidenceRow }) {
  const [showDetails, setShowDetails] = useState(false)
  const isSOCReport = evidence.sourceType === "SOC Report"

  // Process explanation for SOC reports
  const processedExplanation = isSOCReport && evidence.explanation
    ? formatSOCExplanation(evidence.explanation)
    : evidence.explanation

  // Parse evidence data for SOC reports
  const socEvidenceTable = isSOCReport && evidence.evidenceData
    ? parseSOCEvidenceData(evidence.evidenceData)
    : null

  return (
    <div className="bg-gradient-to-br from-white via-gray-50 to-blue-50/30 rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      {/* Evidence Header */}
      <div className="p-4 bg-gray-50/80 backdrop-blur-sm border-b border-gray-200">
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
              Assessed At:{" "}
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
          {processedExplanation && (
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
                  {processedExplanation}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {evidence.evidenceData && (
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Evidence Data
              </div>
              {isSOCReport && socEvidenceTable ? (
                <div className="bg-gray-50 rounded p-3 border border-gray-200 overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-300 border border-gray-300">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 border-r border-gray-300 w-48">
                          Field
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900">
                          Value
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {socEvidenceTable.map((row, idx) => (
                        <tr key={idx} className="align-top">
                          <td className="px-3 py-2 text-xs font-medium text-gray-700 border-r border-gray-200 whitespace-nowrap">
                            {row.key}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
                            {row.cleanedValue}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
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
              )}
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
      {Math.round(score)}%
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