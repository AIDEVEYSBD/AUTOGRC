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

type FilterKey = 
  | "name"
  | "owners"
  | "criticality"
  | "drLevel"
  | "lifecycleStatus"
  | "hostingType"
  | "categories"
  | "status"

export default function ApplicationsTable({
  rows,
}: {
  rows: ApplicationRow[]
}) {
  const [sortKey, setSortKey] = useState<SortKey>("name")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [activeFilter, setActiveFilter] = useState<FilterKey | null>(null)
  const [filters, setFilters] = useState<Record<FilterKey, string>>({
    name: "",
    owners: "",
    criticality: "",
    drLevel: "",
    lifecycleStatus: "",
    hostingType: "",
    categories: "",
    status: "",
  })

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  function toggleFilter(key: FilterKey) {
    if (activeFilter === key) {
      setActiveFilter(null)
    } else {
      setActiveFilter(key)
    }
  }

  function updateFilter(key: FilterKey, value: string) {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  function clearFilter(key: FilterKey) {
    setFilters(prev => ({ ...prev, [key]: "" }))
    setActiveFilter(null)
  }

  // Apply all active filters
  const filtered = rows.filter(app => {
    const nameMatch = 
      !filters.name || 
      app.name.toLowerCase().includes(filters.name.toLowerCase()) ||
      app.primaryFqdn.toLowerCase().includes(filters.name.toLowerCase())
    
    const ownersMatch = 
      !filters.owners ||
      app.serviceOwner.toLowerCase().includes(filters.owners.toLowerCase()) ||
      app.businessOwner.toLowerCase().includes(filters.owners.toLowerCase())
    
    const criticalityMatch = 
      !filters.criticality ||
      app.criticality.toLowerCase().includes(filters.criticality.toLowerCase())
    
    const drLevelMatch = 
      !filters.drLevel ||
      app.drLevel.toString().includes(filters.drLevel)
    
    const lifecycleMatch = 
      !filters.lifecycleStatus ||
      app.lifecycleStatus.toLowerCase().includes(filters.lifecycleStatus.toLowerCase())
    
    const hostingMatch = 
      !filters.hostingType ||
      app.serviceManagement.toLowerCase().includes(filters.hostingType.toLowerCase()) ||
      (app.cloudProvider && app.cloudProvider.toLowerCase().includes(filters.hostingType.toLowerCase()))
    
    const categoriesMatch = 
      !filters.categories ||
      app.applicabilityCategories.some(cat => 
        cat.toLowerCase().includes(filters.categories.toLowerCase())
      )
    
    const statusMatch = 
      !filters.status ||
      app.status.toLowerCase().includes(filters.status.toLowerCase())

    return nameMatch && ownersMatch && criticalityMatch && drLevelMatch && 
           lifecycleMatch && hostingMatch && categoriesMatch && statusMatch
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

  const activeFilterCount = Object.values(filters).filter(f => f !== "").length

  return (
    <div className="space-y-4">
      {/* Filter Status Bar */}
      {activeFilterCount > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-600">
            {sorted.length} of {rows.length} applications
            {activeFilterCount > 0 && (
              <span className="ml-2 text-gray-500">
                • {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""} active
              </span>
            )}
          </div>
          <button
            onClick={() => {
              setFilters({
                name: "",
                owners: "",
                criticality: "",
                drLevel: "",
                lifecycleStatus: "",
                hostingType: "",
                categories: "",
                status: "",
              })
              setActiveFilter(null)
            }}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-[#FFE600] text-xs uppercase tracking-wide">
              <tr>
                <ThWithFilter
                  label="Application"
                  sortKey="name"
                  filterKey="name"
                  currentSortKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                  isFilterActive={activeFilter === "name"}
                  onToggleFilter={toggleFilter}
                  filterValue={filters.name}
                  onFilterChange={updateFilter}
                  onClearFilter={clearFilter}
                  hasActiveFilter={filters.name !== ""}
                />
                <ThWithFilter
                  label="Owners"
                  filterKey="owners"
                  isFilterActive={activeFilter === "owners"}
                  onToggleFilter={toggleFilter}
                  filterValue={filters.owners}
                  onFilterChange={updateFilter}
                  onClearFilter={clearFilter}
                  hasActiveFilter={filters.owners !== ""}
                />
                <ThWithFilter
                  label="Criticality"
                  sortKey="criticality"
                  filterKey="criticality"
                  currentSortKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                  isFilterActive={activeFilter === "criticality"}
                  onToggleFilter={toggleFilter}
                  filterValue={filters.criticality}
                  onFilterChange={updateFilter}
                  onClearFilter={clearFilter}
                  hasActiveFilter={filters.criticality !== ""}
                />
                <ThWithFilter
                  label="DR Level"
                  sortKey="drLevel"
                  filterKey="drLevel"
                  currentSortKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                  isFilterActive={activeFilter === "drLevel"}
                  onToggleFilter={toggleFilter}
                  filterValue={filters.drLevel}
                  onFilterChange={updateFilter}
                  onClearFilter={clearFilter}
                  hasActiveFilter={filters.drLevel !== ""}
                />
                <ThWithFilter
                  label="Lifecycle"
                  sortKey="lifecycleStatus"
                  filterKey="lifecycleStatus"
                  currentSortKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                  isFilterActive={activeFilter === "lifecycleStatus"}
                  onToggleFilter={toggleFilter}
                  filterValue={filters.lifecycleStatus}
                  onFilterChange={updateFilter}
                  onClearFilter={clearFilter}
                  hasActiveFilter={filters.lifecycleStatus !== ""}
                />
                <ThWithFilter
                  label="Hosting Type"
                  filterKey="hostingType"
                  isFilterActive={activeFilter === "hostingType"}
                  onToggleFilter={toggleFilter}
                  filterValue={filters.hostingType}
                  onFilterChange={updateFilter}
                  onClearFilter={clearFilter}
                  hasActiveFilter={filters.hostingType !== ""}
                />
                <ThWithFilter
                  label="Categories"
                  filterKey="categories"
                  isFilterActive={activeFilter === "categories"}
                  onToggleFilter={toggleFilter}
                  filterValue={filters.categories}
                  onFilterChange={updateFilter}
                  onClearFilter={clearFilter}
                  hasActiveFilter={filters.categories !== ""}
                />
                <ThWithFilter
                  label="Status"
                  sortKey="status"
                  filterKey="status"
                  currentSortKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                  isFilterActive={activeFilter === "status"}
                  onToggleFilter={toggleFilter}
                  filterValue={filters.status}
                  onFilterChange={updateFilter}
                  onClearFilter={clearFilter}
                  hasActiveFilter={filters.status !== ""}
                />
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
                    {activeFilterCount > 0
                      ? "No applications match your filters."
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
   Table Header with Filter
───────────────────────────────────────────── */

function ThWithFilter({
  label,
  sortKey,
  filterKey,
  currentSortKey,
  sortDir,
  onSort,
  isFilterActive,
  onToggleFilter,
  filterValue,
  onFilterChange,
  onClearFilter,
  hasActiveFilter,
}: {
  label: string
  sortKey?: SortKey
  filterKey: FilterKey
  currentSortKey?: SortKey
  sortDir?: "asc" | "desc"
  onSort?: (key: SortKey) => void
  isFilterActive: boolean
  onToggleFilter: (key: FilterKey) => void
  filterValue: string
  onFilterChange: (key: FilterKey, value: string) => void
  onClearFilter: (key: FilterKey) => void
  hasActiveFilter: boolean
}) {
  const isSortActive = sortKey && currentSortKey === sortKey

  return (
    <th className="px-4 py-3.5 text-left font-semibold text-gray-700 relative">
      <div className="flex items-center gap-2">
        {/* Label and Sort Icon */}
        <div 
          className={`flex items-center gap-2 ${sortKey ? "cursor-pointer select-none hover:text-gray-900" : ""} ${isSortActive ? "text-gray-900" : ""}`}
          onClick={() => sortKey && onSort && onSort(sortKey)}
        >
          <span>{label}</span>
          {sortKey && (
            <svg
              className={`w-4 h-4 transition-all ${
                isSortActive ? "text-gray-900" : "text-gray-600"
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

        {/* Filter Icon */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleFilter(filterKey)
          }}
          className={`p-1 rounded hover:bg-gray-900/10 transition-colors ${
            hasActiveFilter ? "text-blue-600" : "text-gray-600"
          }`}
          title="Filter column"
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
      </div>

      {/* Filter Dropdown */}
      {isFilterActive && (
        <div className="absolute top-full left-0 mt-2 z-20 bg-white rounded-lg border border-gray-200 shadow-lg p-3 min-w-[250px]">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={filterValue}
              onChange={(e) => onFilterChange(filterKey, e.target.value)}
              placeholder={`Filter ${label.toLowerCase()}...`}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-200"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
            {filterValue && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onClearFilter(filterKey)
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
      )}
    </th>
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