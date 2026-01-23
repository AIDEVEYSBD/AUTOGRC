"use client"

import { useState } from "react"
import Link from "next/link"

type ApplicationRow = {
  id: string
  name: string

  // Primary access
  primaryUrl: string
  primaryFqdn: string

  // Ownership
  serviceOwner: string
  businessOwner: string
  serviceDirector: string | null
  serviceVp: string | null

  // Classification
  informationClassification: string | null
  criticality: "C1" | "C2" | "C3" | "C4"
  drLevel: number

  // Lifecycle
  lifecycleStatus: "Active" | "Deprecated" | "Decommissioned"
  endOfLifeDate: string | null

  // Operating model
  serviceManagement:
    | "Vendor Managed Cloud"
    | "Org-Managed Cloud"
    | "Hybrid"
    | "On-Premise"
    | "SaaS"
  cloudProvider: string | null

  // Applicability
  applicabilityCategories: string[]

  // Computed metrics
  status: "Compliant" | "Warning" | "Critical"
  score: number
  nonCompliances: number
  lastAssessedAt: string | null
}

type SortKey =
  | "name"
  | "status"
  | "score"
  | "nonCompliances"
  | "lastAssessedAt"
  | "criticality"
  | "drLevel"
  | "lifecycleStatus"

export default function ApplicationsTable({
  rows,
}: {
  rows: ApplicationRow[]
}) {
  const [sortKey, setSortKey] = useState<SortKey>("name")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [searchQuery, setSearchQuery] = useState("")

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  // Filter based on search
  const filtered = rows.filter(app => {
    const query = searchQuery.toLowerCase()
    return (
      app.name.toLowerCase().includes(query) ||
      app.serviceOwner.toLowerCase().includes(query) ||
      app.businessOwner.toLowerCase().includes(query) ||
      app.primaryFqdn.toLowerCase().includes(query) ||
      app.applicabilityCategories.some(cat =>
        cat.toLowerCase().includes(query)
      )
    )
  })

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    let av: any = a[sortKey]
    let bv: any = b[sortKey]

    // Handle null values
    if (av === null) av = ""
    if (bv === null) bv = ""

    if (av < bv) return sortDir === "asc" ? -1 : 1
    if (av > bv) return sortDir === "asc" ? 1 : -1
    return 0
  })

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="text-sm text-gray-600">
          {sorted.length} of {rows.length} applications
        </div>

        <input
          type="text"
          placeholder="Search applications, owners, categories..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-80 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#FFE600] text-xs uppercase tracking-wide">
              <tr>
                <Th
                  onClick={() => toggleSort("name")}
                  isActive={sortKey === "name"}
                  sortDir={sortKey === "name" ? sortDir : undefined}
                >
                  Application
                </Th>
                <Th>Owners</Th>
                <Th
                  onClick={() => toggleSort("criticality")}
                  isActive={sortKey === "criticality"}
                  sortDir={sortKey === "criticality" ? sortDir : undefined}
                >
                  Criticality
                </Th>
                <Th
                  onClick={() => toggleSort("drLevel")}
                  isActive={sortKey === "drLevel"}
                  sortDir={sortKey === "drLevel" ? sortDir : undefined}
                >
                  DR Level
                </Th>
                <Th
                  onClick={() => toggleSort("lifecycleStatus")}
                  isActive={sortKey === "lifecycleStatus"}
                  sortDir={sortKey === "lifecycleStatus" ? sortDir : undefined}
                >
                  Lifecycle
                </Th>
                <Th>Hosting Type</Th>
                <Th>Categories</Th>
                <Th
                  onClick={() => toggleSort("status")}
                  isActive={sortKey === "status"}
                  sortDir={sortKey === "status" ? sortDir : undefined}
                >
                  Status
                </Th>
                <Th
                  onClick={() => toggleSort("score")}
                  isActive={sortKey === "score"}
                  sortDir={sortKey === "score" ? sortDir : undefined}
                >
                  Score
                </Th>
                <Th
                  onClick={() => toggleSort("nonCompliances")}
                  isActive={sortKey === "nonCompliances"}
                  sortDir={sortKey === "nonCompliances" ? sortDir : undefined}
                >
                  Non-Compliances
                </Th>
                <Th
                  onClick={() => toggleSort("lastAssessedAt")}
                  isActive={sortKey === "lastAssessedAt"}
                  sortDir={sortKey === "lastAssessedAt" ? sortDir : undefined}
                >
                  Last Assessed
                </Th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {sorted.map(app => (
                <tr
                  key={app.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <Td className="font-semibold">
                    <Link
                      href={`/applications/${app.id}`}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {app.name}
                    </Link>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {app.primaryFqdn}
                    </div>
                  </Td>

                  <Td>
                    <div className="leading-tight">
                      <div className="font-medium text-gray-900">
                        {app.serviceOwner}
                      </div>
                      <div className="text-xs text-gray-500">
                        {app.businessOwner}
                      </div>
                    </div>
                  </Td>

                  <Td>
                    <CriticalityBadge criticality={app.criticality} />
                  </Td>

                  <Td>
                    <DRLevelBadge level={app.drLevel} />
                  </Td>

                  <Td>
                    <LifecycleBadge status={app.lifecycleStatus} />
                  </Td>

                  <Td>
                    <ServiceManagementBadge
                      type={app.serviceManagement}
                      provider={app.cloudProvider}
                    />
                  </Td>

                  <Td>
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {app.applicabilityCategories.length > 0 ? (
                        app.applicabilityCategories.map(cat => (
                          <span
                            key={cat}
                            className="px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700"
                          >
                            {cat}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </div>
                  </Td>

                  <Td>
                    <StatusBadge status={app.status} />
                  </Td>

                  <Td>
                    <ScoreBar value={app.score} />
                  </Td>

                  <Td
                    className={
                      app.nonCompliances > 0
                        ? "font-semibold text-red-600"
                        : "text-gray-600"
                    }
                  >
                    {app.nonCompliances}
                  </Td>

                  <Td className="text-gray-600">
                    {app.lastAssessedAt
                      ? new Date(app.lastAssessedAt).toLocaleDateString()
                      : "—"}
                  </Td>
                </tr>
              ))}

              {sorted.length === 0 && (
                <tr>
                  <Td colSpan={11} className="py-8 text-center text-gray-500">
                    {searchQuery
                      ? "No applications match your search."
                      : "No applications found."}
                  </Td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Badge Components
───────────────────────────────────────────── */

function CriticalityBadge({
  criticality,
}: {
  criticality: "C1" | "C2" | "C3" | "C4"
}) {
  const variants = {
    C1: "bg-red-100 text-red-800 border-red-200",
    C2: "bg-orange-100 text-orange-800 border-orange-200",
    C3: "bg-yellow-100 text-yellow-800 border-yellow-200",
    C4: "bg-green-100 text-green-800 border-green-200",
  }

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-bold ${variants[criticality]}`}
    >
      {criticality}
    </span>
  )
}

function DRLevelBadge({ level }: { level: number }) {
  const variants = {
    1: "bg-red-100 text-red-800 border-red-200",
    2: "bg-orange-100 text-orange-800 border-orange-200",
    3: "bg-yellow-100 text-yellow-800 border-yellow-200",
    4: "bg-blue-100 text-blue-800 border-blue-200",
    5: "bg-green-100 text-green-800 border-green-200",
  }

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-bold ${
        variants[level as keyof typeof variants] || "bg-gray-100 text-gray-800"
      }`}
    >
      DR {level}
    </span>
  )
}

function LifecycleBadge({
  status,
}: {
  status: "Active" | "Deprecated" | "Decommissioned"
}) {
  const variants = {
    Active: "bg-green-100 text-green-800 border-green-200",
    Deprecated: "bg-yellow-100 text-yellow-800 border-yellow-200",
    Decommissioned: "bg-gray-100 text-gray-800 border-gray-200",
  }

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium ${variants[status]}`}
    >
      {status}
    </span>
  )
}

function ServiceManagementBadge({
  type,
  provider,
}: {
  type: ApplicationRow["serviceManagement"]
  provider: string | null
}) {
  const typeShort = {
    "Vendor Managed Cloud": "Vendor Cloud",
    "Org-Managed Cloud": "Org Cloud",
    Hybrid: "Hybrid",
    "On-Premise": "On-Prem",
    SaaS: "SaaS",
  }

  return (
    <div className="space-y-1">
      <span className="inline-flex items-center rounded-md border border-blue-200 bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800">
        {typeShort[type]}
      </span>
      {provider && (
        <div className="text-xs text-gray-500">{provider}</div>
      )}
    </div>
  )
}

function StatusBadge({
  status,
}: {
  status: "Compliant" | "Warning" | "Critical"
}) {
  const variants = {
    Compliant: "bg-green-100 text-green-800 border-green-200",
    Warning: "bg-amber-100 text-amber-800 border-amber-200",
    Critical: "bg-red-100 text-red-800 border-red-200",
  }

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium ${variants[status]}`}
    >
      {status}
    </span>
  )
}

function ScoreBar({ value }: { value: number }) {
  const color =
    value >= 80 ? "bg-green-500" : value >= 60 ? "bg-amber-500" : "bg-red-500"

  return (
    <div className="flex items-center gap-3">
      <div className="h-2 w-full max-w-[120px] rounded-full bg-gray-200">
        <div
          className={`h-2 rounded-full ${color} transition-all`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="w-10 text-right font-medium text-gray-900">
        {value}%
      </span>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Table Components
───────────────────────────────────────────── */

function Th({
  children,
  onClick,
  isActive,
  sortDir,
}: {
  children: React.ReactNode
  onClick?: () => void
  isActive?: boolean
  sortDir?: "asc" | "desc"
}) {
  return (
    <th
      onClick={onClick}
      className={`px-4 py-3.5 text-left font-semibold ${
        onClick ? "cursor-pointer select-none hover:text-gray-900" : ""
      } ${isActive ? "text-gray-900" : "text-gray-700"}`}
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
    <td colSpan={colSpan} className={`px-4 py-3.5 ${className ?? ""}`}>
      {children}
    </td>
  )
}