"use client"

import { useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { ChevronDown } from "lucide-react"

/* ---------------- TYPES ---------------- */

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
  isAutomated: boolean | null
  compliantApps: number
  nonCompliantApps: number
  avgScore: number
}

type Props = {
  domains: SecurityDomain[]
  initialDomain: string | null
  initialControls: ControlInDomain[]
  onDomainChange: (domain: string) => Promise<ControlInDomain[]>
}

/* ---------------- RESIZABLE COLUMNS ---------------- */

function useResizableColumns(initial: number[]) {
  const [widths, setWidths] = useState(initial)

  function startResize(index: number, e: React.MouseEvent) {
    const startX = e.clientX
    const startWidth = widths[index]

    function onMove(ev: MouseEvent) {
      const delta = ev.clientX - startX
      setWidths(w =>
        w.map((v, i) =>
          i === index ? Math.max(120, startWidth + delta) : v
        )
      )
    }

    function onUp() {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }

    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
  }

  return { widths, startResize }
}

/* ---------------- FILTER DROPDOWN ---------------- */

function ColumnFilter({
  value,
  onChange,
  onClear,
}: {
  value: string
  onChange: (v: string) => void
  onClear: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative ml-2">
      <button onClick={() => setOpen(!open)}>
        <ChevronDown size={14} className="text-white/60 hover:text-white" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="absolute z-20 mt-2 w-56 glass-dark border border-white/10 rounded-lg p-3">
            <input
              autoFocus
              value={value}
              onChange={e => onChange(e.target.value)}
              placeholder="Filter…"
              className="w-full rounded bg-black border border-white/10 px-2 py-1 text-sm text-white focus:border-yellow-400 outline-none"
            />
            {value && (
              <button
                onClick={onClear}
                className="mt-2 text-xs text-yellow-400 hover:underline"
              >
                Clear
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

/* ---------------- MAIN COMPONENT ---------------- */

export function ComplianceByDomain({
  domains,
  initialDomain,
  initialControls,
  onDomainChange,
}: Props) {
  const [selectedDomain, setSelectedDomain] = useState(initialDomain)
  const [controls, setControls] = useState(initialControls)
  const [loading, setLoading] = useState(false)
  const [idFilter, setIdFilter] = useState("")
  const [statementFilter, setStatementFilter] = useState("")

  const columns = [
    { id: "control", label: "Control", min: 200 },
    { id: "statement", label: "Statement", min: 420 },
    { id: "compliant", label: "Compliant", min: 120 },
    { id: "noncompliant", label: "Non-Compliant", min: 140 },
    { id: "avg", label: "Avg Score", min: 100 },
  ]

  const { widths, startResize } = useResizableColumns(
    columns.map(c => c.min)
  )

  const gridTemplate = widths.map(w => `${w}px`).join(" ")

  const filtered = controls.filter(c =>
    c.controlCode.toLowerCase().includes(idFilter.toLowerCase()) &&
    c.controlStatement.toLowerCase().includes(statementFilter.toLowerCase())
  )

  const scoreColor = (s: number) =>
    s >= 70 ? "bg-green-500" : s >= 40 ? "bg-yellow-400" : "bg-red-500"

  async function changeDomain(name: string) {
    if (name === selectedDomain) return
    setLoading(true)
    setSelectedDomain(name)
    setControls(await onDomainChange(name))
    setLoading(false)
  }

  return (
    <div className="rounded-xl border border-white/10 glass-dark p-6 overflow-hidden transition hover:border-yellow-400 hover:shadow-[0_0_20px_rgba(250,204,21,0.35)]">
      <h2 className="text-2xl font-bold text-white mb-4">
        Compliance by Domain
      </h2>

      <div className="grid grid-cols-[260px_1fr] gap-4">
        {/* DOMAIN LIST */}
        <aside className="space-y-2">
          {domains.map(d => (
            <button
              key={d.id}
              onClick={() => changeDomain(d.name)}
              className={cn(
                "w-full p-4 rounded-lg text-left transition",
                d.name === selectedDomain
                  ? "bg-yellow-400 text-black"
                  : "bg-white/5 text-white hover:bg-white/10"
              )}
            >
              <div className="font-semibold">{d.name}</div>
              <div className="text-xs opacity-80">
                {d.controls} controls · {d.avgCompliance}%
              </div>
            </button>
          ))}
        </aside>

        {/* TABLE */}
        <div className="relative overflow-hidden">
          <ScrollArea className="h-[600px] w-full">
            <div>
              {/* HEADER */}
              <div
                className="sticky top-0 z-10 glass-dark border-b border-white/10"
                style={{
                  display: "grid",
                  gridTemplateColumns: gridTemplate,
                }}
              >
                {columns.map((c, i) => (
                  <div
                    key={c.id}
                    className="relative h-12 px-4 flex items-center font-bold text-white whitespace-nowrap"
                  >
                    {c.label}

                    {c.id === "control" && (
                      <ColumnFilter
                        value={idFilter}
                        onChange={setIdFilter}
                        onClear={() => setIdFilter("")}
                      />
                    )}

                    {c.id === "statement" && (
                      <ColumnFilter
                        value={statementFilter}
                        onChange={setStatementFilter}
                        onClear={() => setStatementFilter("")}
                      />
                    )}

                    <div
                      onMouseDown={e => startResize(i, e)}
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-yellow-400"
                    />
                  </div>
                ))}
              </div>

              {/* BODY */}
              {loading ? (
                <div className="p-10 text-center text-white/60">
                  Loading…
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-10 text-center text-white/60">
                  No controls found
                </div>
              ) : (
                filtered.map(c => (
                  <div
                    key={c.id}
                    className="border-b border-white/5 hover:bg-white/5 transition"
                    style={{
                      display: "grid",
                      gridTemplateColumns: gridTemplate,
                    }}
                  >
                    <div className="px-4 py-4">
                      <div className="font-semibold text-white">
                        {c.controlCode}
                      </div>
                      {c.subDomain && (
                        <div className="text-xs text-white/50">
                          {c.subDomain}
                        </div>
                      )}
                      {c.isAutomated && (
                        <Badge className="mt-1 bg-blue-500/20 text-blue-300">
                          Auto
                        </Badge>
                      )}
                    </div>

                    <div className="px-4 py-4 text-white/80">
                      {c.controlStatement}
                    </div>

                    <div className="px-4 py-4 flex justify-center font-bold text-white">
                      {c.compliantApps}
                    </div>

                    <div className="px-4 py-4 flex justify-center font-bold text-white">
                      {c.nonCompliantApps}
                    </div>

                    <div className="px-4 py-4 flex items-center justify-center gap-2">
                      <span
                        className={cn(
                          "h-3 w-3 rounded-full",
                          scoreColor(c.avgScore)
                        )}
                      />
                      <span className="font-bold text-white">
                        {c.avgScore}%
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}