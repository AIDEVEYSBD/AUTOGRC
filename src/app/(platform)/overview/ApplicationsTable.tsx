"use client"

import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

/* ================= TYPES ================= */

type FilterMode = "contains" | "startsWith" | "equals"

type ColumnFilter = {
  value: string
  mode: FilterMode
}

type ApplicationsMatrixData = {
  frameworks: { id: string; name: string }[]
  rows: {
    id: string
    name: string
    owner: string
    overallScore: number
    byFramework: Record<
      string,
      { percent: number; done: number; total: number }
    >
  }[]
}

/* ================= HELPERS ================= */

function ringColorClass(p: number) {
  if (p >= 70) return "bg-green-500"
  if (p >= 40) return "bg-yellow-400"
  return "bg-red-500"
}

function applyFilter(
  text: string,
  filter?: ColumnFilter
) {
  if (!filter || !filter.value) return true

  const t = text.toLowerCase()
  const v = filter.value.toLowerCase()

  if (filter.mode === "contains") return t.includes(v)
  if (filter.mode === "startsWith") return t.startsWith(v)
  return t === v
}

/* ================= COMPONENT ================= */

export function ApplicationsTable({
  matrix,
}: {
  matrix: ApplicationsMatrixData
}) {
  const [filters, setFilters] = useState<
    Record<string, ColumnFilter>
  >({})

  const [sort, setSort] = useState<{
    key: string
    dir: "asc" | "desc"
  } | null>(null)

  /* ---------- FILTER + SORT ---------- */

  let visibleRows = matrix.rows.filter((row) =>
    applyFilter(row.name, filters["name"]) &&
    applyFilter(row.owner, filters["owner"])
  )

  if (sort) {
    visibleRows = [...visibleRows].sort((a, b) => {
      const aVal =
        sort.key === "overall"
          ? a.overallScore
          : a.byFramework[sort.key]?.percent ?? 0

      const bVal =
        sort.key === "overall"
          ? b.overallScore
          : b.byFramework[sort.key]?.percent ?? 0

      return sort.dir === "asc" ? aVal - bVal : bVal - aVal
    })
  }

  /* ================= RENDER ================= */

  return (
    <div className="rounded-xl border border-white/10 glass-dark hover:border-yellow-400 hover:shadow-[0_0_20px_rgba(250,204,21,0.35)] transition">
      <Table>

        {/* ================= HEADER ================= */}

        <TableHeader>
          <TableRow className="border-b border-white/10">

            {/* APPLICATIONS HEADER */}
            <TableHead className="text-white font-semibold">
              <HeaderMenu
                title="Applications"
                onSort={(dir) => setSort({ key: "name", dir })}
                filter={filters["name"]}
                onFilterChange={(f) =>
                  setFilters({ ...filters, name: f })
                }
              />
            </TableHead>

            {/* FRAMEWORK HEADERS */}
            {matrix.frameworks.map((fw) => (
              <TableHead key={fw.id} className="text-center">
                <HeaderMenu
                  title={fw.name}
                  center
                  onSort={(dir) =>
                    setSort({ key: fw.id, dir })
                  }
                />
              </TableHead>
            ))}

            {/* OVERALL */}
            <TableHead className="text-center">
              <HeaderMenu
                title="Overall"
                center
                onSort={(dir) =>
                  setSort({ key: "overall", dir })
                }
              />
            </TableHead>
          </TableRow>
        </TableHeader>

        {/* ================= BODY ================= */}

        <TableBody>
          {visibleRows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={matrix.frameworks.length + 2}
                className="text-center py-10 text-white/60"
              >
                No applications found
              </TableCell>
            </TableRow>
          ) : (
            visibleRows.map((app) => (
              <TableRow
                key={app.id}
                className="border-b border-white/5 hover:bg-white/5 transition"
              >
                {/* APPLICATION */}
                <TableCell>
                  <div className="font-semibold text-white hover:text-yellow-400">
                    {app.name}
                  </div>
                  <div className="text-xs text-white/50">
                    {app.owner}
                  </div>
                </TableCell>

                {/* FRAMEWORK CELLS */}
                {matrix.frameworks.map((fw) => {
                  const cell = app.byFramework[fw.id]
                  return (
                    <TableCell key={fw.id} className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "h-3 w-3 rounded-full",
                              ringColorClass(cell.percent)
                            )}
                          />
                          <span className="text-white font-medium">
                            {cell.percent}%
                          </span>
                        </div>
                        <span className="text-xs text-white/50">
                          {cell.done}/{cell.total}
                        </span>
                      </div>
                    </TableCell>
                  )
                })}

                {/* OVERALL */}
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <span
                      className={cn(
                        "h-3 w-3 rounded-full",
                        ringColorClass(app.overallScore)
                      )}
                    />
                    <span className="text-white font-semibold">
                      {app.overallScore}%
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

/* ================= HEADER DROPDOWN ================= */

function HeaderMenu({
  title,
  center,
  onSort,
  filter,
  onFilterChange,
}: {
  title: string
  center?: boolean
  onSort?: (dir: "asc" | "desc") => void
  filter?: ColumnFilter
  onFilterChange?: (f: ColumnFilter) => void
}) {
  const [value, setValue] = useState(filter?.value ?? "")
  const [mode, setMode] = useState<FilterMode>(
    filter?.mode ?? "contains"
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-1 text-white font-medium hover:text-yellow-400",
            center && "mx-auto"
          )}
        >
          {title}
          <ChevronDown className="h-4 w-4 opacity-70" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-56 bg-black border border-white/10 glass-dark"
        align="start"
      >
        {onSort && (
          <>
            <DropdownMenuItem onClick={() => onSort("asc")}>
              Sort ascending
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSort("desc")}>
              Sort descending
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {onFilterChange && (
          <div className="px-3 py-2 space-y-2">
            <select
              value={mode}
              onChange={(e) =>
                setMode(e.target.value as FilterMode)
              }
              className="w-full rounded bg-black border border-white/10 text-white text-sm px-2 py-1"
            >
              <option value="contains">Contains</option>
              <option value="startsWith">Starts with</option>
              <option value="equals">Equals</option>
            </select>

            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Filter value"
              className="bg-black border-white/10 text-white"
            />

            <Button
              size="sm"
              className="w-full bg-yellow-400 text-black hover:bg-yellow-300"
              onClick={() =>
                onFilterChange({ value, mode })
              }
            >
              Apply
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
