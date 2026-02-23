"use client"

import { useEffect, useMemo, useState } from "react"

// API routes - use Next.js API for reads (database), scheduler for writes
const NEXTJS_API_BASE = "/api"
const SCHEDULER_API_BASE = (process.env.NEXT_PUBLIC_SCHEDULER_API_BASE ||
  "http://localhost:3101"
).replace(/\/$/, "")

type Framework = { id: string; name: string }

type RunSummary = {
  total_mappings: number
  full_overlap: number
  partial_overlap: number
  avg_score: number
}

type Run = {
  id: string
  source_framework_name: string
  target_framework_name: string
  status: "Queued" | "Running" | "Completed" | "Failed" | string
  summary: RunSummary
  created_at?: string
  completed_at?: string | null
}

type Mapping = {
  source_control_code: string
  source_domain: string
  source_sub_domain: string
  source_control_statement: string
  target_control_code: string
  target_control_statement: string
  overlap_score: number
  status: string
  explanation: string
}

type SocRun = {
  id: string
  status: "Queued" | "Running" | "Completed" | "Failed" | string
  created_at: string
  completed_at: string | null
  soc_report_name: string
  master_framework_name: string
}

type SocResult = {
  control_id: string
  domain: string
  sub_domain: string | null
  control_statement: string
  soc_control_code: string
  soc_control_statement: string
  score: number
  status: "Met" | "Partially Met" | "Not Met" | string
  explanation: string
  created_at: string
}

function normalizeScoreTo100(x: number): number {
  const n = Number.isFinite(x) ? x : 0
  // Backward compatible: if mapper emits 0..1, treat as fraction
  if (n <= 1) return Math.max(0, Math.min(100, n * 100))
  return Math.max(0, Math.min(100, n))
}

function statusBadgeClasses(status: string) {
  const s = (status || "").toLowerCase()
  if (s === "completed") return "bg-[#e8f5e9] text-[#00a758]"
  if (s === "running") return "bg-[#fff7ed] text-[#f59e0b]"
  if (s === "queued") return "bg-[#eef2ff] text-[#4f46e5]"
  if (s === "failed") return "bg-[#fee] text-[#e41f13]"
  return "bg-[#f3f4f6] text-[#333333]"
}

function scoreColor(score0to100: number) {
  if (score0to100 >= 70) return "text-[#00a758]"
  if (score0to100 >= 40) return "text-[#f59e0b]"
  return "text-[#e41f13]"
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init)
  if (!r.ok) {
    const txt = await r.text().catch(() => "")
    throw new Error(`HTTP ${r.status} ${r.statusText}: ${txt}`)
  }
  return r.json()
}

export default function FrameworkBaselinerPage() {
  const [tab, setTab] = useState<"framework" | "soc">("framework")

  // Framework mapping state
  const [frameworks, setFrameworks] = useState<Framework[]>([])
  const [runs, setRuns] = useState<Run[]>([])
  const [source, setSource] = useState("")
  const [target, setTarget] = useState("")
  const [showInstructions, setShowInstructions] = useState(false)

  const [openRunId, setOpenRunId] = useState<string | null>(null)
  const [mappings, setMappings] = useState<Mapping[]>([])
  const [summary, setSummary] = useState<RunSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [starting, setStarting] = useState(false)

  // SOC mapping state
  const [socRuns, setSocRuns] = useState<SocRun[]>([])
  const [socOpenRunId, setSocOpenRunId] = useState<string | null>(null)
  const [socResults, setSocResults] = useState<SocResult[]>([])
  const [socLoading, setSocLoading] = useState(false)
  const [socStarting, setSocStarting] = useState(false)
  const [socReportName, setSocReportName] = useState("Azure SOC 2 Type II")
  const [azureControlsPath, setAzureControlsPath] = useState("azure_controls.json")

  const frameworkHasActiveRuns = useMemo(
    () => runs.some((r) => ["queued", "running"].includes((r.status || "").toLowerCase())),
    [runs]
  )
  const socHasActiveRuns = useMemo(
    () => socRuns.some((r) => ["queued", "running"].includes((r.status || "").toLowerCase())),
    [socRuns]
  )

  const fetchFrameworks = async () => {
    // Still use scheduler API for frameworks list
    const data = await fetchJson<Framework[]>(`${SCHEDULER_API_BASE}/frameworks`)
    setFrameworks(data || [])
  }

  const fetchRuns = async () => {
    // Read from database via Next.js API
    const data = await fetchJson<Run[]>(`${NEXTJS_API_BASE}/framework-map-runs`)
    setRuns(data || [])
  }

  const fetchSocRuns = async () => {
    // Read from database via Next.js API
    const data = await fetchJson<SocRun[]>(`${NEXTJS_API_BASE}/soc-runs`)
    setSocRuns(data || [])
  }

  useEffect(() => {
    fetchFrameworks().catch(() => setFrameworks([]))
    fetchRuns().catch(() => setRuns([]))
    fetchSocRuns().catch(() => setSocRuns([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Poll only when there are active runs (keeps demo smooth)
  useEffect(() => {
    if (!frameworkHasActiveRuns) return
    const t = setInterval(() => {
      fetchRuns().catch(() => {})
    }, 5000)
    return () => clearInterval(t)
  }, [frameworkHasActiveRuns])

  useEffect(() => {
    if (!socHasActiveRuns) return
    const t = setInterval(() => {
      fetchSocRuns().catch(() => {})
    }, 5000)
    return () => clearInterval(t)
  }, [socHasActiveRuns])

  const startRun = async () => {
    if (!source || !target || source === target) return
    setStarting(true)
    try {
      // Write operation uses scheduler API
      await fetchJson(`${SCHEDULER_API_BASE}/framework-map-runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_framework_id: source,
          target_framework_id: target,
          top_k: 5,
          workers: 5,
        }),
      })
      setSource("")
      setTarget("")
      await fetchRuns()
    } finally {
      setStarting(false)
    }
  }

  const openRun = async (runId: string) => {
    setOpenRunId(runId)
    setLoading(true)
    try {
      // Read from database via Next.js API
      const data = await fetchJson<{ run: any; summary: RunSummary; mappings: Mapping[] }>(
        `${NEXTJS_API_BASE}/framework-map-runs/${runId}/results`
      )
      setMappings(data.mappings ?? [])
      setSummary(data.summary ?? null)
    } finally {
      setLoading(false)
    }
  }

  const closeModal = () => {
    setOpenRunId(null)
    setMappings([])
    setSummary(null)
    setLoading(false)
  }

  const downloadExcel = () => {
    if (!openRunId) return
    // Excel download uses scheduler API
    window.open(`${SCHEDULER_API_BASE}/framework-map-runs/${openRunId}/report`, "_blank")
  }

  const startSocRun = async () => {
    if (!azureControlsPath.trim()) return
    setSocStarting(true)
    try {
      // Write operation uses scheduler API
      await fetchJson(`${SCHEDULER_API_BASE}/soc-runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          soc_report_name: socReportName || "Azure SOC 2 Type II",
          top_k: 5,
          workers: 5,
          Azure_controls_path: azureControlsPath.trim(),
        }),
      })
      await fetchSocRuns()
    } finally {
      setSocStarting(false)
    }
  }

  const openSocRun = async (socRunId: string) => {
    setSocOpenRunId(socRunId)
    setSocLoading(true)
    try {
      // Read from database via Next.js API
      const data = await fetchJson<{ run: any; results: SocResult[] }>(
        `${NEXTJS_API_BASE}/soc-runs/${socRunId}/results`
      )
      setSocResults(data.results ?? [])
    } finally {
      setSocLoading(false)
    }
  }

  const closeSocModal = () => {
    setSocOpenRunId(null)
    setSocResults([])
    setSocLoading(false)
  }

  const downloadSocExcel = () => {
    if (!socOpenRunId) return
    // Excel download uses scheduler API
    window.open(`${SCHEDULER_API_BASE}/soc-runs/${socOpenRunId}/report`, "_blank")
  }

  const disableStart = starting || !source || !target || source === target
  const disableSocStart = socStarting || !azureControlsPath.trim()

  const socSummary = useMemo(() => {
    const total = socResults.length
    const met = socResults.filter((r) => (r.status || "").toLowerCase() === "met").length
    const partial = socResults.filter((r) => (r.status || "").toLowerCase() === "partially met").length
    const notMet = socResults.filter((r) => (r.status || "").toLowerCase() === "not met").length
    const avg =
      total === 0
        ? 0
        : socResults.reduce((acc, r) => acc + normalizeScoreTo100(r.score), 0) / total
    return { total, met, partial, notMet, avg }
  }, [socResults])

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-[#333333]">
            {tab === "framework" ? "Framework Baseliner" : "SOC Mapper"}
          </h1>
          <p className="text-base text-[#666666] max-w-3xl mt-2">
            {tab === "framework" ? (
              <>
                Generate AI-assisted control mappings between two frameworks. This creates a baseline coverage
                relationship so you can compare standards, identify overlaps and gaps, and reuse evidence across frameworks.
              </>
            ) : (
              <>
                Map Azure SOC control evidence to your master framework using the SOC pipeline, producing per-control
                Met, Partially Met, or Not Met outcomes with explanations and scores.
              </>
            )}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setTab("framework")}
            className={`px-4 py-2 text-sm font-bold rounded border transition-colors ${
              tab === "framework"
                ? "bg-[#333333] text-white border-[#333333]"
                : "bg-white text-[#333333] border-[#cccccc] hover:bg-[#f9f9f9]"
            }`}
          >
            Framework
          </button>
          <button
            onClick={() => setTab("soc")}
            className={`px-4 py-2 text-sm font-bold rounded border transition-colors ${
              tab === "soc"
                ? "bg-[#333333] text-white border-[#333333]"
                : "bg-white text-[#333333] border-[#cccccc] hover:bg-[#f9f9f9]"
            }`}
          >
            SOC
          </button>
        </div>
      </div>

      {/* FRAMEWORK TAB */}
      {tab === "framework" && (
        <>
          {/* Create New Mapping */}
          <div className="border border-[#cccccc] bg-white p-6 rounded-lg shadow-sm space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-[#333333]">Create New Mapping</h2>
                <p className="mt-1 text-sm text-[#666666]">
                  Select a source framework and a target framework to generate a new mapping run.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowInstructions(true)}
                  className="px-4 py-2 text-sm font-bold border border-[#cccccc] text-[#333333] rounded hover:bg-[#f9f9f9] transition-colors flex items-center gap-2"
                  title="View instructions"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Instructions
                </button>
                <button
                  onClick={() => fetchRuns().catch(() => {})}
                  className="px-4 py-2 text-sm font-bold border border-[#cccccc] text-[#333333] rounded hover:bg-[#f9f9f9] transition-colors"
                  title="Refresh runs"
                >
                  Refresh
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#333333]">Source framework</label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full border border-[#cccccc] px-3 py-2 rounded bg-white text-[#333333] focus:outline-none focus:border-[#ffe600] focus:ring-2 focus:ring-[#ffe600]/20"
                >
                  <option value="">Select source</option>
                  {frameworks.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-[#333333]">Target framework</label>
                <select
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="w-full border border-[#cccccc] px-3 py-2 rounded bg-white text-[#333333] focus:outline-none focus:border-[#ffe600] focus:ring-2 focus:ring-[#ffe600]/20"
                >
                  <option value="">Select target</option>
                  {frameworks.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {source && target && source === target && (
              <div className="flex items-center gap-2 text-sm text-[#e41f13] bg-[#fee] px-4 py-3 rounded">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                Source and target must be different frameworks.
              </div>
            )}

            <button
              onClick={startRun}
              disabled={disableStart}
              className={`w-full px-4 py-3 font-bold bg-[#ffe600] text-[#333333] rounded transition-colors ${
                disableStart ? "cursor-not-allowed" : "hover:bg-[#333333] hover:text-white"
              }`}
            >
              {starting ? "Starting…" : "Start AI Mapping"}
            </button>
          </div>

          {/* Runs Table */}
          <div className="border border-[#cccccc] bg-white rounded-lg overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-sm">
              <thead className="bg-[#f9f9f9] border-b border-[#cccccc]">
                <tr>
                  <th className="px-4 py-3 text-left font-bold text-[#333333]">Source</th>
                  <th className="px-4 py-3 text-left font-bold text-[#333333]">Target</th>
                  <th className="px-4 py-3 text-left font-bold text-[#333333]">Status</th>
                  <th className="px-4 py-3 text-left font-bold text-[#333333]">Mappings</th>
                  <th className="px-4 py-3 text-left font-bold text-[#333333]">Avg Score</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => {
                  const avg = normalizeScoreTo100(r.summary?.avg_score ?? 0)
                  return (
                    <tr
                      key={r.id}
                      onClick={() => openRun(r.id)}
                      className="cursor-pointer border-t border-[#e5e7eb] hover:bg-[#f9f9f9] transition-colors"
                      title="Click to view results"
                    >
                      <td className="px-4 py-3 text-[#333333]">{r.source_framework_name}</td>
                      <td className="px-4 py-3 text-[#333333]">{r.target_framework_name}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${statusBadgeClasses(r.status)}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#333333] font-semibold">{r.summary?.total_mappings ?? 0}</td>
                      <td className="px-4 py-3 text-[#333333] font-semibold">{avg.toFixed(1)}</td>
                    </tr>
                  )
                })}

                {runs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-[#666666]">
                      No mapping runs yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </div>

          {/* Modal */}
          {openRunId && (
            <div
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={(e) => {
                if (e.target === e.currentTarget) closeModal()
              }}
            >
              <div className="bg-white w-full max-w-7xl max-h-[90vh] rounded-lg overflow-hidden shadow-2xl flex flex-col">
                <div className="flex justify-between items-center px-6 py-4 border-b border-[#cccccc] bg-[#f9f9f9] flex-shrink-0">
                  <div>
                    <h3 className="text-xl font-bold text-[#333333]">Mapping Results</h3>
                    {summary ? (
                      <p className="text-sm text-[#666666] mt-1">
                        {summary.full_overlap} full · {summary.partial_overlap} partial · {summary.total_mappings} total · avg{" "}
                        {normalizeScoreTo100(summary.avg_score).toFixed(1)}
                      </p>
                    ) : (
                      <p className="text-sm text-[#666666] mt-1">Run summary unavailable</p>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={downloadExcel}
                      className="px-4 py-2 font-bold bg-[#ffe600] text-[#333333] rounded hover:bg-[#333333] hover:text-white transition-colors"
                      title="Download the canonical Excel report"
                    >
                      Download Excel
                    </button>
                    <button
                      onClick={closeModal}
                      className="px-4 py-2 font-bold border border-[#cccccc] text-[#333333] rounded hover:bg-[#f9f9f9] transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>

                <div className="overflow-auto flex-1">
                  {loading ? (
                    <div className="flex items-center justify-center p-12">
                      <div className="text-center">
                        <div className="inline-block w-8 h-8 border-4 border-[#cccccc] border-t-[#ffe600] rounded-full animate-spin mb-4"></div>
                        <p className="text-[#666666]">Loading results…</p>
                      </div>
                    </div>
                  ) : (
                    <table className="w-full min-w-[700px] text-sm">
                      <thead className="bg-[#f9f9f9] sticky top-0 border-b border-[#cccccc] z-10">
                        <tr>
                          <th className="px-4 py-3 text-left font-bold text-[#333333]">Source</th>
                          <th className="px-4 py-3 text-left font-bold text-[#333333]">Domain</th>
                          <th className="px-4 py-3 text-left font-bold text-[#333333]">Sub-Domain</th>
                          <th className="px-4 py-3 text-left font-bold text-[#333333]">Target</th>
                          <th className="px-4 py-3 text-left font-bold text-[#333333]">Score</th>
                          <th className="px-4 py-3 text-left font-bold text-[#333333]">Status</th>
                          <th className="px-4 py-3 text-left font-bold text-[#333333]">Explanation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mappings.map((m, i) => {
                          const s100 = normalizeScoreTo100(m.overlap_score)
                          return (
                            <tr key={i} className="border-t border-[#e5e7eb] align-top hover:bg-[#f9f9f9]">
                              <td className="px-4 py-3 text-[#333333] font-semibold whitespace-nowrap">
                                {m.source_control_code}
                              </td>
                              <td className="px-4 py-3 text-[#666666] whitespace-nowrap">{m.source_domain || "—"}</td>
                              <td className="px-4 py-3 text-[#666666] whitespace-nowrap">{m.source_sub_domain || "—"}</td>
                              <td className="px-4 py-3 text-[#333333] font-semibold whitespace-nowrap">
                                {m.target_control_code}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`font-bold ${scoreColor(s100)}`}>{s100.toFixed(1)}</span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span
                                  className={`text-xs font-bold px-3 py-1 rounded-full ${
                                    (m.status || "") === "Full Overlap"
                                      ? "bg-[#e8f5e9] text-[#00a758]"
                                      : (m.status || "") === "Partial Overlap"
                                      ? "bg-[#fff7ed] text-[#f59e0b]"
                                      : "bg-[#fee] text-[#e41f13]"
                                  }`}
                                >
                                  {m.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-[#666666] text-xs leading-relaxed min-w-[400px] max-w-[500px]">
                                {m.explanation}
                              </td>
                            </tr>
                          )
                        })}

                        {mappings.length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-4 py-12 text-center text-[#666666]">
                              No mapping results available for this run.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Instructions Modal */}
          {showInstructions && (
            <div
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={(e) => {
                if (e.target === e.currentTarget) setShowInstructions(false)
              }}
            >
              <div className="bg-white w-full max-w-2xl rounded-lg shadow-2xl overflow-hidden">
                <div className="flex justify-between items-center px-6 py-4 border-b border-[#cccccc] bg-[#f9f9f9]">
                  <h3 className="text-xl font-bold text-[#333333]">How to Use Framework Baseliner</h3>
                  <button
                    onClick={() => setShowInstructions(false)}
                    className="text-[#666666] hover:text-[#333333] transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="p-6 space-y-4 text-[#333333]">
                  <div className="space-y-2">
                    <h4 className="font-bold text-lg">Step 1: Select Frameworks</h4>
                    <p className="text-sm text-[#666666]">
                      Choose a <strong>source framework</strong> (map from) and a <strong>target framework</strong> (map to).
                      These must be different frameworks.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-lg">Step 2: Start the Mapping</h4>
                    <p className="text-sm text-[#666666]">
                      Click <strong>Start AI Mapping</strong>. The system generates an overlap baseline between the two standards.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-lg">Step 3: View Results</h4>
                    <p className="text-sm text-[#666666]">
                      Once complete, click a run row to view mappings, scores, and explanations.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-lg">Step 4: Download Reports</h4>
                    <p className="text-sm text-[#666666]">
                      In the results view, click <strong>Download Excel</strong> to export the canonical report.
                    </p>
                  </div>
                </div>

                <div className="px-6 py-4 bg-[#f9f9f9] border-t border-[#cccccc] flex justify-end">
                  <button
                    onClick={() => setShowInstructions(false)}
                    className="px-6 py-2 font-bold bg-[#ffe600] text-[#333333] rounded hover:bg-[#333333] hover:text-white transition-colors"
                  >
                    Got it!
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* SOC TAB */}
      {tab === "soc" && (
        <>
          {/* Create SOC Run */}
          <div className="border border-[#cccccc] bg-white p-6 rounded-lg shadow-sm space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-[#333333]">Run SOC Mapping</h2>
                <p className="mt-1 text-sm text-[#666666]">
                  Provide the Azure controls JSON path available to the scheduler service. The master framework is resolved server-side.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => fetchSocRuns().catch(() => {})}
                  className="px-4 py-2 text-sm font-bold border border-[#cccccc] text-[#333333] rounded hover:bg-[#f9f9f9] transition-colors"
                  title="Refresh SOC runs"
                >
                  Refresh
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#333333]">SOC report name</label>
                <input
                  value={socReportName}
                  onChange={(e) => setSocReportName(e.target.value)}
                  className="w-full border border-[#cccccc] px-3 py-2 rounded bg-white text-[#333333] focus:outline-none focus:border-[#ffe600] focus:ring-2 focus:ring-[#ffe600]/20"
                  placeholder="Azure SOC 2 Type II"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-[#333333]">Azure controls JSON path</label>
                <input
                  value={azureControlsPath}
                  onChange={(e) => setAzureControlsPath(e.target.value)}
                  className="w-full border border-[#cccccc] px-3 py-2 rounded bg-white text-[#333333] focus:outline-none focus:border-[#ffe600] focus:ring-2 focus:ring-[#ffe600]/20"
                  placeholder="azure_controls.json"
                />
                <p className="text-xs text-[#666666]">
                  Example: <span className="font-mono">azure_controls.json</span> or an absolute path on the scheduler machine.
                </p>
              </div>
            </div>

            <button
              onClick={startSocRun}
              disabled={disableSocStart}
              className={`w-full px-4 py-3 font-bold bg-[#ffe600] text-[#333333] rounded transition-colors ${
                disableSocStart ? "cursor-not-allowed" : "hover:bg-[#333333] hover:text-white"
              }`}
            >
              {socStarting ? "Starting…" : "Start SOC Mapping"}
            </button>
          </div>

          {/* SOC Runs Table */}
          <div className="border border-[#cccccc] bg-white rounded-lg overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="bg-[#f9f9f9] border-b border-[#cccccc]">
                <tr>
                  <th className="px-4 py-3 text-left font-bold text-[#333333]">Report</th>
                  <th className="px-4 py-3 text-left font-bold text-[#333333]">Master Framework</th>
                  <th className="px-4 py-3 text-left font-bold text-[#333333]">Status</th>
                  <th className="px-4 py-3 text-left font-bold text-[#333333]">Created</th>
                </tr>
              </thead>
              <tbody>
                {socRuns.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => openSocRun(r.id)}
                    className="cursor-pointer border-t border-[#e5e7eb] hover:bg-[#f9f9f9] transition-colors"
                    title="Click to view results"
                  >
                    <td className="px-4 py-3 text-[#333333]">{r.soc_report_name}</td>
                    <td className="px-4 py-3 text-[#333333]">{r.master_framework_name}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${statusBadgeClasses(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#666666]">
                      {r.created_at ? new Date(r.created_at).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}

                {socRuns.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-[#666666]">
                      No SOC runs yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </div>

          {/* SOC Modal */}
          {socOpenRunId && (
            <div
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={(e) => {
                if (e.target === e.currentTarget) closeSocModal()
              }}
            >
              <div className="bg-white w-full max-w-7xl max-h-[90vh] rounded-lg overflow-hidden shadow-2xl flex flex-col">
                <div className="flex justify-between items-center px-6 py-4 border-b border-[#cccccc] bg-[#f9f9f9] flex-shrink-0">
                  <div>
                    <h3 className="text-xl font-bold text-[#333333]">SOC Mapping Results</h3>
                    <p className="text-sm text-[#666666] mt-1">
                      {socSummary.met} met · {socSummary.partial} partial · {socSummary.notMet} not met · {socSummary.total} total · avg{" "}
                      {socSummary.avg.toFixed(1)}
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={downloadSocExcel}
                      className="px-4 py-2 font-bold bg-[#ffe600] text-[#333333] rounded hover:bg-[#333333] hover:text-white transition-colors"
                      title="Download SOC Excel report"
                    >
                      Download Excel
                    </button>
                    <button
                      onClick={closeSocModal}
                      className="px-4 py-2 font-bold border border-[#cccccc] text-[#333333] rounded hover:bg-[#f9f9f9] transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>

                <div className="overflow-auto flex-1">
                  {socLoading ? (
                    <div className="flex items-center justify-center p-12">
                      <div className="text-center">
                        <div className="inline-block w-8 h-8 border-4 border-[#cccccc] border-t-[#ffe600] rounded-full animate-spin mb-4"></div>
                        <p className="text-[#666666]">Loading results…</p>
                      </div>
                    </div>
                  ) : (
                    <table className="w-full min-w-[700px] text-sm">
                      <thead className="bg-[#f9f9f9] sticky top-0 border-b border-[#cccccc] z-10">
                        <tr>
                          <th className="px-4 py-3 text-left font-bold text-[#333333]">Domain</th>
                          <th className="px-4 py-3 text-left font-bold text-[#333333]">Sub-Domain</th>
                          <th className="px-4 py-3 text-left font-bold text-[#333333]">Master Control</th>
                          <th className="px-4 py-3 text-left font-bold text-[#333333]">SOC Control</th>
                          <th className="px-4 py-3 text-left font-bold text-[#333333]">Score</th>
                          <th className="px-4 py-3 text-left font-bold text-[#333333]">Status</th>
                          <th className="px-4 py-3 text-left font-bold text-[#333333]">Explanation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {socResults.map((m, i) => {
                          const s100 = normalizeScoreTo100(m.score)
                          const st = (m.status || "").toLowerCase()
                          return (
                            <tr key={i} className="border-t border-[#e5e7eb] align-top hover:bg-[#f9f9f9]">
                              <td className="px-4 py-3 text-[#666666] whitespace-nowrap">{m.domain || "—"}</td>
                              <td className="px-4 py-3 text-[#666666] whitespace-nowrap">{m.sub_domain || "—"}</td>
                              <td className="px-4 py-3 text-[#333333] text-xs leading-relaxed min-w-[320px] max-w-[420px]">
                                {m.control_statement}
                              </td>
                              <td className="px-4 py-3 text-[#333333] font-semibold whitespace-nowrap">
                                {m.soc_control_code || "—"}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`font-bold ${scoreColor(s100)}`}>{s100.toFixed(1)}</span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span
                                  className={`text-xs font-bold px-3 py-1 rounded-full ${
                                    st === "met"
                                      ? "bg-[#e8f5e9] text-[#00a758]"
                                      : st === "partially met"
                                      ? "bg-[#fff7ed] text-[#f59e0b]"
                                      : "bg-[#fee] text-[#e41f13]"
                                  }`}
                                >
                                  {m.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-[#666666] text-xs leading-relaxed min-w-[380px] max-w-[520px]">
                                {m.explanation}
                              </td>
                            </tr>
                          )
                        })}

                        {socResults.length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-4 py-12 text-center text-[#666666]">
                              No SOC results available for this run.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}