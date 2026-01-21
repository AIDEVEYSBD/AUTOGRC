"use client"

import { useEffect, useState } from "react"

const API_BASE = "http://localhost:3101"

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
  status: string
  summary: RunSummary
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

export default function FrameworkBaselinerPage() {
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

  useEffect(() => {
    fetch(`${API_BASE}/frameworks`)
      .then((r) => r.json())
      .then(setFrameworks)

    fetchRuns()
  }, [])

  const fetchRuns = () =>
    fetch(`${API_BASE}/framework-map-runs`)
      .then((r) => r.json())
      .then(setRuns)

  const startRun = async () => {
    if (!source || !target || source === target) return

    setStarting(true)
    try {
      await fetch(`${API_BASE}/framework-map-runs`, {
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
      fetchRuns()
    } finally {
      setStarting(false)
    }
  }

  const openRun = async (runId: string) => {
    setOpenRunId(runId)
    setLoading(true)

    try {
      const res = await fetch(`${API_BASE}/framework-map-runs/${runId}/results`)
      const data = await res.json()

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
    window.open(`${API_BASE}/framework-map-runs/${openRunId}/report`, "_blank")
  }

  const disableStart = starting || !source || !target || source === target

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#333333]">
          Framework Baseliner
        </h1>
        <p className="text-base text-[#666666] max-w-3xl mt-2">
          Generate AI-assisted control mappings between two frameworks. This
          creates a baseline coverage relationship so you can compare standards,
          identify overlaps and gaps, and reuse evidence across frameworks.
        </p>
      </div>

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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-[#333333]">
              Source framework
            </label>
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
            <label className="text-sm font-bold text-[#333333]">
              Target framework
            </label>
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
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
        <table className="w-full text-sm">
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
            {runs.map((r) => (
              <tr
                key={r.id}
                onClick={() => openRun(r.id)}
                className="cursor-pointer border-t border-[#e5e7eb] hover:bg-[#f9f9f9] transition-colors"
                title="Click to view results"
              >
                <td className="px-4 py-3 text-[#333333]">{r.source_framework_name}</td>
                <td className="px-4 py-3 text-[#333333]">{r.target_framework_name}</td>
                <td className="px-4 py-3">
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#e8f5e9] text-[#00a758]">
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-[#333333] font-semibold">{r.summary.total_mappings}</td>
                <td className="px-4 py-3 text-[#333333] font-semibold">{r.summary.avg_score.toFixed(2)}</td>
              </tr>
            ))}

            {runs.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-[#666666]"
                >
                  No mapping runs yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
                    {summary.full_overlap} full · {summary.partial_overlap} partial ·{" "}
                    {summary.total_mappings} total · avg {summary.avg_score.toFixed(2)}
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
                <table className="w-full text-sm">
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
                    {mappings.map((m, i) => (
                      <tr key={i} className="border-t border-[#e5e7eb] align-top hover:bg-[#f9f9f9]">
                        <td className="px-4 py-3 text-[#333333] font-semibold whitespace-nowrap">
                          {m.source_control_code}
                        </td>
                        <td className="px-4 py-3 text-[#666666] whitespace-nowrap">
                          {m.source_domain || "—"}
                        </td>
                        <td className="px-4 py-3 text-[#666666] whitespace-nowrap">
                          {m.source_sub_domain || "—"}
                        </td>
                        <td className="px-4 py-3 text-[#333333] font-semibold whitespace-nowrap">
                          {m.target_control_code}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`font-bold ${
                            m.overlap_score >= 0.7 
                              ? "text-[#00a758]" 
                              : m.overlap_score >= 0.4 
                              ? "text-[#f59e0b]" 
                              : "text-[#e41f13]"
                          }`}>
                            {m.overlap_score.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                            m.status === "Full Overlap"
                              ? "bg-[#e8f5e9] text-[#00a758]"
                              : m.status === "Partial Overlap"
                              ? "bg-[#fff7ed] text-[#f59e0b]"
                              : "bg-[#fee] text-[#e41f13]"
                          }`}>
                            {m.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#666666] text-xs leading-relaxed min-w-[400px] max-w-[500px]">
                          {m.explanation}
                        </td>
                      </tr>
                    ))}

                    {mappings.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-12 text-center text-[#666666]"
                        >
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
                  Choose a <strong>source framework</strong> (the framework you want to map from) and a <strong>target framework</strong> (the framework you want to map to). These must be different frameworks.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-lg">Step 2: Start the Mapping</h4>
                <p className="text-sm text-[#666666]">
                  Click the <strong>"Start AI Mapping"</strong> button. The Framework Baseliner will analyze both frameworks and create intelligent mappings between the controls. This process may take a few minutes.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-lg">Step 3: View Results</h4>
                <p className="text-sm text-[#666666]">
                  Once complete, the mapping will appear in the table below. Click on any row to view detailed results, including:
                </p>
                <ul className="list-disc list-inside text-sm text-[#666666] ml-4 space-y-1">
                  <li>Control codes from both frameworks</li>
                  <li>Overlap scores (how closely controls match)</li>
                  <li>AI-generated explanations for each mapping</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-lg">Step 4: Download Reports</h4>
                <p className="text-sm text-[#666666]">
                  In the results view, click <strong>"Download Excel"</strong> to export the complete mapping report for your records or further analysis.
                </p>
              </div>

              <div className="bg-[#fffbea] border border-[#ffe600] rounded p-4 mt-6">
                <div className="flex gap-3">
                  <svg className="w-5 h-5 text-[#f59e0b] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="font-bold text-sm text-[#333333]">Note</p>
                    <p className="text-sm text-[#666666] mt-1">
                      The AI mapping process uses generative models to analyze and relate framework controls. While it aims for accuracy, always review the mappings to ensure they meet your specific compliance needs.
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