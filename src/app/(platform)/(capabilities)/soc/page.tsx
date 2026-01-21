"use client"

import { useEffect, useMemo, useRef, useState } from "react"

const API_BASE = "http://localhost:3101"

// Hardcoded SOC run config (hidden from UI)
const DEFAULT_AZURE_CONTROLS_PATH = "azure_controls.json"
const DEFAULT_TOP_K = 5
const DEFAULT_WORKERS = 5

type SocRun = {
  id: string
  status: "Queued" | "Running" | "Completed" | "Failed" | string
  created_at: string
  completed_at: string | null
  soc_report_name: string
  master_framework_name: string
}

type SocResult = {
  domain: string
  sub_domain: string | null
  control_statement: string

  soc_control_code: string
  soc_control_statement: string

  score: number // 0-100
  status: "Met" | "Partially Met" | "Not Met" | string
  explanation: string
  created_at: string
}

type SocSummary = {
  total: number
  met: number
  partial: number
  not_met: number
  avg_score: number
}

export default function SocMapperPage() {
  const [runs, setRuns] = useState<SocRun[]>([])

  const [showInstructions, setShowInstructions] = useState(false)

  // Upload state (dummy gating, front end only)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState<string>("")

  // Modal state
  const [openRunId, setOpenRunId] = useState<string | null>(null)
  const [openRunMeta, setOpenRunMeta] = useState<SocRun | null>(null)
  const [results, setResults] = useState<SocResult[]>([])
  const [loading, setLoading] = useState(false)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    fetchRuns()
  }, [])

  const fetchRuns = () =>
    fetch(`${API_BASE}/soc-runs`)
      .then((r) => r.json())
      .then(setRuns)

  const onPickPdfClick = () => {
    setUploadError("")
    fileInputRef.current?.click()
  }

  const onFileSelected = (file: File | null) => {
    setUploadError("")
    setPdfFile(null)

    if (!file) return

    const isPdfByType = (file.type || "").toLowerCase() === "application/pdf"
    const isPdfByName = file.name.toLowerCase().endsWith(".pdf")
    if (!isPdfByType && !isPdfByName) {
      setUploadError("Please upload a valid PDF file.")
      return
    }

    setPdfFile(file)
  }

  const removePdf = () => {
    setPdfFile(null)
    setUploadError("")
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const startRun = async () => {
    if (!pdfFile) return

    setStarting(true)
    try {
      // We label the run using the uploaded PDF filename.
      // The backend still uses Azure_controls.json for the actual mapping inputs.
      const socReportName = stripPdfExt(pdfFile.name)

      await fetch(`${API_BASE}/soc-runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          soc_report_name: socReportName,
          top_k: DEFAULT_TOP_K,
          workers: DEFAULT_WORKERS,
          Azure_controls_path: DEFAULT_AZURE_CONTROLS_PATH,
        }),
      })

      fetchRuns()
    } finally {
      setStarting(false)
    }
  }

  const openRun = async (runId: string) => {
    const run = runs.find((x) => x.id === runId) || null
    setOpenRunId(runId)
    setOpenRunMeta(run)
    setLoading(true)

    try {
      const res = await fetch(`${API_BASE}/soc-runs/${runId}/results`)
      const data = await res.json()
      setResults(data.results ?? [])
    } finally {
      setLoading(false)
    }
  }

  const closeModal = () => {
    setOpenRunId(null)
    setOpenRunMeta(null)
    setResults([])
    setLoading(false)
  }

  const downloadExcel = () => {
    if (!openRunId) return
    window.open(`${API_BASE}/soc-runs/${openRunId}/report`, "_blank")
  }

  const disableStart = starting || !pdfFile

  const summary: SocSummary = useMemo(() => {
    const total = results.length
    const met = results.filter((r) => r.status === "Met").length
    const partial = results.filter((r) => r.status === "Partially Met").length
    const not_met = total - met - partial
    const avg_score = total
      ? round2(results.reduce((acc, r) => acc + (Number(r.score) || 0), 0) / total)
      : 0
    return { total, met, partial, not_met, avg_score }
  }, [results])

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#333333]">SOC Mapper</h1>
        <p className="text-base text-[#666666] max-w-3xl mt-2">
          Upload the SOC report PDF and run the SOC mapping. Then review per-control results (Met, Partially Met, Not Met),
          download the canonical Excel report, and keep a run history.
        </p>
      </div>

      {/* Create New SOC Run */}
      <div className="border border-[#cccccc] bg-white p-6 rounded-lg shadow-sm space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[#333333]">Run SOC Mapping</h2>
            <p className="mt-1 text-sm text-[#666666]">
              Upload the SOC report PDF to enable the run. SOC configuration is handled internally.
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
              onClick={fetchRuns}
              className="px-4 py-2 text-sm font-bold border border-[#cccccc] text-[#333333] rounded hover:bg-[#f9f9f9] transition-colors"
              title="Refresh runs"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Hidden input, visible upload card */}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => onFileSelected(e.target.files?.[0] ?? null)}
        />

        <div className="border border-[#cccccc] rounded-lg p-5 bg-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-[#333333]">SOC report PDF</p>
              <p className="text-xs text-[#666666] mt-1">
                Upload a PDF to enable running the mapper.
              </p>
            </div>

            <div className="flex gap-2">
              {!pdfFile ? (
                <button
                  onClick={onPickPdfClick}
                  className="px-4 py-2 text-sm font-bold border border-[#cccccc] text-[#333333] rounded hover:bg-[#f9f9f9] transition-colors"
                >
                  Upload PDF
                </button>
              ) : (
                <button
                  onClick={removePdf}
                  className="px-4 py-2 text-sm font-bold border border-[#cccccc] text-[#333333] rounded hover:bg-[#f9f9f9] transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          {uploadError && (
            <div className="mt-4 flex items-center gap-2 text-sm text-[#e41f13] bg-[#fee] px-4 py-3 rounded">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              {uploadError}
            </div>
          )}

          {pdfFile && (
            <div className="mt-4 bg-[#f9f9f9] border border-[#e5e7eb] rounded p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#333333] truncate">{pdfFile.name}</p>
                  <p className="text-xs text-[#666666] mt-1">
                    {(pdfFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#e8f0fe] text-[#2563eb]">
                  Ready
                </span>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={startRun}
          disabled={disableStart}
          className={`w-full px-4 py-3 font-bold bg-[#ffe600] text-[#333333] rounded transition-colors ${
            disableStart ? "cursor-not-allowed" : "hover:bg-[#333333] hover:text-white"
          }`}
        >
          {starting ? "Starting…" : "Start SOC Mapping"}
        </button>
      </div>

      {/* Runs Table */}
      <div className="border border-[#cccccc] bg-white rounded-lg overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-[#f9f9f9] border-b border-[#cccccc]">
            <tr>
              <th className="px-4 py-3 text-left font-bold text-[#333333]">SOC Report</th>
              <th className="px-4 py-3 text-left font-bold text-[#333333]">Master Framework</th>
              <th className="px-4 py-3 text-left font-bold text-[#333333]">Status</th>
              <th className="px-4 py-3 text-left font-bold text-[#333333]">Created</th>
              <th className="px-4 py-3 text-left font-bold text-[#333333]">Completed</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr
                key={r.id}
                onClick={() => openRun(r.id)}
                className="cursor-pointer border-t border-[#e5e7eb] hover:bg-[#f9f9f9] transition-colors"
                title="Click to view results"
              >
                <td className="px-4 py-3 text-[#333333] font-semibold">{r.soc_report_name}</td>
                <td className="px-4 py-3 text-[#333333]">{r.master_framework_name}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${statusPill(r.status)}`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-[#666666]">{formatTs(r.created_at)}</td>
                <td className="px-4 py-3 text-[#666666]">{r.completed_at ? formatTs(r.completed_at) : "-"}</td>
              </tr>
            ))}

            {runs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[#666666]">
                  No SOC runs yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Results Modal */}
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
                <h3 className="text-xl font-bold text-[#333333]">SOC Mapping Results</h3>
                <p className="text-sm text-[#666666] mt-1">
                  {openRunMeta?.soc_report_name || "SOC Run"} · {openRunMeta?.master_framework_name || "Master"} ·{" "}
                  {summary.met} met · {summary.partial} partial · {summary.not_met} not met · {summary.total} total · avg{" "}
                  {summary.avg_score.toFixed(2)}
                </p>
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
                <table className="w-full text-sm">
                  <thead className="bg-[#f9f9f9] sticky top-0 border-b border-[#cccccc] z-10">
                    <tr>
                      <th className="px-4 py-3 text-left font-bold text-[#333333]">Domain</th>
                      <th className="px-4 py-3 text-left font-bold text-[#333333]">Sub-domain</th>
                      <th className="px-4 py-3 text-left font-bold text-[#333333]">Control statement</th>
                      <th className="px-4 py-3 text-left font-bold text-[#333333]">SOC control</th>
                      <th className="px-4 py-3 text-left font-bold text-[#333333]">Score</th>
                      <th className="px-4 py-3 text-left font-bold text-[#333333]">Status</th>
                      <th className="px-4 py-3 text-left font-bold text-[#333333]">Explanation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => (
                      <tr key={i} className="border-t border-[#e5e7eb] align-top hover:bg-[#f9f9f9]">
                        <td className="px-4 py-3 text-[#333333] font-semibold whitespace-nowrap">
                          {r.domain || "SOC"}
                        </td>
                        <td className="px-4 py-3 text-[#666666] whitespace-nowrap">{r.sub_domain || "-"}</td>
                        <td className="px-4 py-3 text-[#333333] text-xs leading-relaxed min-w-[420px] max-w-[520px]">
                          {r.control_statement}
                        </td>
                        <td className="px-4 py-3 text-[#333333] text-xs leading-relaxed min-w-[360px] max-w-[520px]">
                          <div className="font-semibold whitespace-nowrap">{r.soc_control_code ? r.soc_control_code : "-"}</div>
                          <div className="text-[#666666] mt-1">{r.soc_control_statement || ""}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`font-bold ${scoreColor(r.score)}`}>{round2(r.score).toFixed(2)}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-xs font-bold px-3 py-1 rounded-full ${socStatusPill(r.status)}`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#666666] text-xs leading-relaxed min-w-[420px] max-w-[560px]">
                          {r.explanation}
                        </td>
                      </tr>
                    ))}

                    {results.length === 0 && (
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
              <h3 className="text-xl font-bold text-[#333333]">How to Use SOC Mapper</h3>
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
                <h4 className="font-bold text-lg">Step 1: Upload the SOC report PDF</h4>
                <p className="text-sm text-[#666666]">
                  Upload a PDF file. The Start button stays disabled until a valid PDF is selected.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-lg">Step 2: Start SOC Mapping</h4>
                <p className="text-sm text-[#666666]">
                  Click <strong>"Start SOC Mapping"</strong>. A new SOC run is created and executed by the scheduler.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-lg">Step 3: Review results</h4>
                <p className="text-sm text-[#666666]">
                  Click any run to open the results modal. You will see per-control status, scores, and explanations.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-lg">Step 4: Download Excel</h4>
                <p className="text-sm text-[#666666]">
                  In the results view, click <strong>"Download Excel"</strong> to export the canonical report.
                </p>
              </div>

              <div className="bg-[#fffbea] border border-[#ffe600] rounded p-4 mt-6">
                <div className="flex gap-3">
                  <svg className="w-5 h-5 text-[#f59e0b] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div>
                    <p className="font-bold text-sm text-[#333333]">Note</p>
                    <p className="text-sm text-[#666666] mt-1">
                      This UI gates the run on a PDF upload. The scheduler run uses internal SOC configuration.
                    </p>
                  </div>
                </div>
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
    </div>
  )
}

/* Helpers */
function stripPdfExt(name: string) {
  if (!name) return "SOC Report"
  return name.replace(/\.pdf$/i, "")
}

function round2(v: any) {
  const n = Number(v)
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 100) / 100
}

function formatTs(ts: string) {
  return ts || "-"
}

function statusPill(status: string) {
  const s = (status || "").toLowerCase()
  if (s === "completed") return "bg-[#e8f5e9] text-[#00a758]"
  if (s === "running") return "bg-[#e8f0fe] text-[#2563eb]"
  if (s === "queued") return "bg-[#f3f4f6] text-[#4b5563]"
  if (s === "failed") return "bg-[#fee] text-[#e41f13]"
  return "bg-[#f3f4f6] text-[#4b5563]"
}

function socStatusPill(status: string) {
  const s = (status || "").toLowerCase()
  if (s === "met") return "bg-[#e8f5e9] text-[#00a758]"
  if (s === "partially met") return "bg-[#fff7ed] text-[#f59e0b]"
  return "bg-[#fee] text-[#e41f13]"
}

function scoreColor(score: number) {
  const x = Number(score) || 0
  if (x >= 70) return "text-[#00a758]"
  if (x >= 40) return "text-[#f59e0b]"
  return "text-[#e41f13]"
}
