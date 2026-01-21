"use client"

import { useEffect, useMemo, useState } from "react"

const API_BASE =
  process.env.NEXT_PUBLIC_AUTOGRC_API_BASE?.replace(/\/$/, "") ||
  "http://localhost:3200"

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const DEFAULT_FRAMEWORK_ID = "120051de-9207-4ab8-92ef-dc0bd31b8227" // CIS
const DEFAULT_INTEGRATION = "ssl_labs"

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type EvidenceSource = {
  key: string
  label: string
  table: string
  description: string
}

type EvidenceField = {
  name: string
  type: "number" | "boolean" | "string"
  operators: string[]
}

type EvidenceSourceFields = {
  evidence_source: string
  fields: EvidenceField[]
}

type Framework = { id: string; name: string }

type Control = {
  id: string
  code: string
  statement: string
  domain: string
  sub_domain: string
  label: string
}

type RuleListItem = {
  id: string
  name: string
  integration: string
  control_id: string
  rule: any
}

type PreviewResponse = {
  pass: number
  fail: number
  results: any[]
}

type RunAllResponse = {
  run_id: string
  rules_executed: number
}

type ConditionRow = {
  id: string
  field: string
  operator: string
  value: string
}

// ─────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────
function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

function formatMaybe(value: any) {
  if (value === null || value === undefined || value === "") return "—"
  return String(value)
}

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr))
}

function formatJson(obj: any): string {
  try {
    return JSON.stringify(obj, null, 2)
  } catch {
    return ""
  }
}

function parseJson(text: string): { ok: true; value: any } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(text) }
  } catch (e: any) {
    return { ok: false, error: e?.message || "Invalid JSON" }
  }
}

// ─────────────────────────────────────────────
// Reusable Components
// ─────────────────────────────────────────────
function StatusPill({ text }: { text: string }) {
  const t = (text || "").toLowerCase()
  const base = "inline-flex items-center gap-2 px-2.5 py-1 text-xs font-semibold border rounded-md transition-all duration-200"

  if (t.includes("error") || t.includes("fail")) {
    return (
      <span className={cx(base, "border-red-200 bg-red-50 text-red-700")}>
        <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
        {text}
      </span>
    )
  }

  if (t.includes("running") || t.includes("queued")) {
    return (
      <span className={cx(base, "border-amber-200 bg-amber-50 text-amber-800")}>
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
        {text}
      </span>
    )
  }

  return (
    <span className={cx(base, "border-emerald-200 bg-emerald-50 text-emerald-700")}>
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      {text}
    </span>
  )
}

function Toast({ type, message, onDismiss }: { type: "ok" | "err"; message: string; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3500)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <div
      className={cx(
        "fixed right-6 top-6 z-[60] px-4 py-3 border rounded-md shadow-lg",
        "animate-in slide-in-from-top-5 duration-300",
        type === "ok"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-red-200 bg-red-50 text-red-800"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="text-sm font-semibold">{message}</div>
        <button
          onClick={onDismiss}
          className="text-gray-500 hover:text-gray-700 transition-colors"
        >
          ×
        </button>
      </div>
    </div>
  )
}

function KPICard({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="border border-gray-200 bg-white p-4 rounded-lg hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
      <div className="text-2xl font-semibold text-gray-900">{value}</div>
      <div className="text-xs font-semibold text-gray-600 mt-1">{label}</div>
    </div>
  )
}

function JsonViewer({ data, maxHeight = "320px" }: { data: any; maxHeight?: string }) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div
        className="px-5 py-4 bg-gray-50 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h4 className="text-sm font-semibold text-gray-900">Rule Configuration</h4>
        <span className="text-gray-500 transition-transform duration-300" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          ▼
        </span>
      </div>
      
      <div
        className="overflow-hidden transition-all duration-300"
        style={{
          maxHeight: isExpanded ? maxHeight : "0",
          opacity: isExpanded ? 1 : 0,
        }}
      >
        <div className="p-5 overflow-auto" style={{ maxHeight }}>
          <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-gray-800">
            {formatJson(data)}
          </pre>
        </div>
      </div>
    </div>
  )
}

function Modal({
  title,
  subtitle,
  onClose,
  children,
  actions,
}: {
  title: string
  subtitle?: string
  onClose: () => void
  children: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center animate-in fade-in duration-200"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-white w-[95vw] max-w-7xl max-h-[90vh] rounded-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b bg-gradient-to-r from-gray-50 to-white">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            {subtitle ? <p className="text-xs text-gray-600">{subtitle}</p> : null}
          </div>
          <div className="flex items-center gap-2">
            {actions}
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50 transition-colors duration-200"
            >
              Close
            </button>
          </div>
        </div>

        <div className="overflow-auto">{children}</div>
      </div>
    </div>
  )
}

function ResultsTable({ results, pass, fail }: { results: any[]; pass: number; fail: number }) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-900">Preview Results</h3>
        <p className="text-xs text-gray-600 mt-1">
          <span className="text-emerald-600 font-semibold">{pass} passed</span> ·{" "}
          <span className="text-red-600 font-semibold">{fail} failed</span> · {results?.length || 0} total rows
        </p>
      </div>

      <div className="overflow-auto max-h-[320px]">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 sticky top-0 border-b">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Result</th>
              <th className="px-3 py-2 text-left font-semibold">Details</th>
            </tr>
          </thead>
          <tbody>
            {(results || []).map((row, idx) => (
              <tr key={idx} className="border-t align-top hover:bg-gray-50 transition-colors duration-150">
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className={cx(
                    "font-semibold",
                    row?.result === "pass" ? "text-emerald-600" : "text-red-600"
                  )}>
                    {formatMaybe(row?.result)}
                  </span>
                </td>
                <td className="px-3 py-2 text-gray-700">
                  <JsonViewer data={row} maxHeight="200px" />
                </td>
              </tr>
            ))}
            {!results?.length && (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-center text-gray-500">
                  No results returned
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ControlInfo({ control }: { control: Control | null }) {
  if (!control) {
    return (
      <div className="border border-gray-200 rounded-lg p-5 text-sm text-gray-600">
        Control metadata not available
      </div>
    )
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b bg-gray-50">
        <h4 className="text-sm font-semibold text-gray-900">Control Information</h4>
      </div>
      <div className="p-5 text-sm space-y-3">
        <div>
          <div className="font-semibold text-gray-900 text-base">{control.code}</div>
          <div className="text-gray-700 mt-1">{control.statement}</div>
        </div>
        <div className="flex gap-4 text-xs text-gray-600">
          <div>
            <span className="font-semibold">Domain:</span> {formatMaybe(control.domain)}
          </div>
          <div>
            <span className="font-semibold">Sub-domain:</span> {formatMaybe(control.sub_domain)}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export default function ControlsAutomationPage() {
  // Lists
  const [rules, setRules] = useState<RuleListItem[]>([])
  const [frameworks, setFrameworks] = useState<Framework[]>([])
  const [evidenceSources, setEvidenceSources] = useState<EvidenceSource[]>([])

  // Builder metadata
  const [controls, setControls] = useState<Control[]>([])
  const [selectedControlId, setSelectedControlId] = useState("")

  const [selectedEvidenceSource, setSelectedEvidenceSource] = useState("")
  const [evidenceFields, setEvidenceFields] = useState<EvidenceSourceFields | null>(null)

  // Builder form
  const [ruleName, setRuleName] = useState("")
  const [conditions, setConditions] = useState<ConditionRow[]>([
    { id: crypto.randomUUID(), field: "", operator: "", value: "" },
  ])

  const [passResult] = useState("Compliant")
  const [failResult] = useState("Non-Compliant")

  // UI state
  const [loadingRules, setLoadingRules] = useState(false)
  const [creating, setCreating] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [runningAll, setRunningAll] = useState(false)

  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null)

  // Modal state
  const [openRule, setOpenRule] = useState<RuleListItem | null>(null)
  const [openRuleControlInfo, setOpenRuleControlInfo] = useState<Control | null>(null)
  const [openRulePreview, setOpenRulePreview] = useState<PreviewResponse | null>(null)
  const [openRulePreviewing, setOpenRulePreviewing] = useState(false)

  const [builderPreview, setBuilderPreview] = useState<PreviewResponse | null>(null)
  const [lastRunAll, setLastRunAll] = useState<RunAllResponse | null>(null)

  // Derived KPIs
  const enabledRulesCount = rules.length
  const controlsCovered = useMemo(() => uniq(rules.map((r) => r.control_id)).length, [rules])
  const integrationsUsed = useMemo(() => uniq(rules.map((r) => r.integration)).length, [rules])

  // ─────────────────────────────────────────────
  // API Calls
  // ─────────────────────────────────────────────
  useEffect(() => {
    void bootstrap()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function bootstrap() {
    await Promise.all([loadRules(), loadFrameworks(), loadEvidenceSources()])
    await loadControls(DEFAULT_FRAMEWORK_ID)
  }

  async function loadRules() {
    setLoadingRules(true)
    try {
      const res = await fetch(`${API_BASE}/rules`)
      if (!res.ok) throw new Error(await res.text())
      const data = (await res.json()) as RuleListItem[]
      setRules(data)
    } catch (e: any) {
      setToast({ type: "err", msg: `Failed to load rules: ${e?.message || e}` })
    } finally {
      setLoadingRules(false)
    }
  }

  async function loadFrameworks() {
    try {
      const res = await fetch(`${API_BASE}/rules/metadata/frameworks`)
      if (!res.ok) throw new Error(await res.text())
      const data = (await res.json()) as Framework[]
      setFrameworks(data)
    } catch (e: any) {
      setToast({ type: "err", msg: `Failed to load frameworks: ${e?.message || e}` })
    }
  }

  async function loadEvidenceSources() {
    try {
      const res = await fetch(`${API_BASE}/rules/metadata/evidence-sources`)
      if (!res.ok) throw new Error(await res.text())
      const data = (await res.json()) as EvidenceSource[]
      setEvidenceSources(data)
      if (data?.length && !selectedEvidenceSource) {
        setSelectedEvidenceSource(data[0].key)
      }
    } catch (e: any) {
      setToast({ type: "err", msg: `Failed to load evidence sources: ${e?.message || e}` })
    }
  }

  async function loadControls(frameworkId: string) {
    if (!frameworkId) {
      setControls([])
      return
    }
    try {
      const res = await fetch(`${API_BASE}/rules/metadata/frameworks/${frameworkId}/controls`)
      if (!res.ok) throw new Error(await res.text())
      const data = (await res.json()) as Control[]
      setControls(data)
    } catch (e: any) {
      setToast({ type: "err", msg: `Failed to load controls: ${e?.message || e}` })
    }
  }

  async function loadEvidenceFields(sourceKey: string) {
    if (!sourceKey) {
      setEvidenceFields(null)
      return
    }
    try {
      const res = await fetch(`${API_BASE}/rules/metadata/evidence-sources/${sourceKey}`)
      if (!res.ok) throw new Error(await res.text())
      const data = (await res.json()) as EvidenceSourceFields
      setEvidenceFields(data)
    } catch (e: any) {
      setToast({ type: "err", msg: `Failed to load evidence fields: ${e?.message || e}` })
    }
  }

  useEffect(() => {
    void loadEvidenceFields(selectedEvidenceSource)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEvidenceSource])

  const builderRuleObject = useMemo(() => {
    return {
      name: ruleName || "New rule",
      integration: DEFAULT_INTEGRATION,
      control_id: selectedControlId || "",
      evidence_source: selectedEvidenceSource || "ssl_labs",
      conditions: conditions
        .filter((c) => c.field && c.operator)
        .map((c) => ({
          field: c.field,
          operator: c.operator,
          value: c.value,
        })),
      pass_result: passResult,
      fail_result: failResult,
    }
  }, [ruleName, selectedControlId, selectedEvidenceSource, conditions, passResult, failResult])

  async function handleCreateRule() {
    const ruleObj = builderRuleObject

    if (!ruleObj.control_id) {
      setToast({ type: "err", msg: "Please select a control" })
      return
    }

    if (!ruleObj.name || ruleObj.name === "New rule") {
      setToast({ type: "err", msg: "Please provide a rule name" })
      return
    }

    if (ruleObj.conditions.length === 0) {
      setToast({ type: "err", msg: "Please add at least one condition" })
      return
    }

    setCreating(true)
    try {
      const res = await fetch(`${API_BASE}/rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ruleObj),
      })
      if (!res.ok) throw new Error(await res.text())

      setToast({ type: "ok", msg: "Automation enabled successfully" })
      setBuilderPreview(null)
      
      setRuleName("")
      setSelectedControlId("")
      setConditions([{ id: crypto.randomUUID(), field: "", operator: "", value: "" }])
      
      await loadRules()
    } catch (e: any) {
      setToast({ type: "err", msg: `Create failed: ${e?.message || e}` })
    } finally {
      setCreating(false)
    }
  }

  async function handlePreviewCurrentRule() {
    const ruleObj = builderRuleObject

    if (!ruleObj.control_id) {
      setToast({ type: "err", msg: "Please select a control" })
      return
    }

    if (ruleObj.conditions.length === 0) {
      setToast({ type: "err", msg: "Please add at least one condition" })
      return
    }

    setPreviewing(true)
    try {
      const res = await fetch(`${API_BASE}/rules/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ruleObj),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = (await res.json()) as PreviewResponse
      setBuilderPreview(data)
    } catch (e: any) {
      setToast({ type: "err", msg: `Preview failed: ${e?.message || e}` })
    } finally {
      setPreviewing(false)
    }
  }

  async function handleRunAll() {
    setRunningAll(true)
    try {
      const res = await fetch(`${API_BASE}/rules/run`, { method: "POST" })
      if (!res.ok) throw new Error(await res.text())
      const data = (await res.json()) as RunAllResponse
      setLastRunAll(data)
      setToast({ type: "ok", msg: `Executed ${data.rules_executed} rule(s) successfully` })
    } catch (e: any) {
      setToast({ type: "err", msg: `Run all failed: ${e?.message || e}` })
    } finally {
      setRunningAll(false)
    }
  }

  async function resolveControlInfoById(controlId: string): Promise<Control | null> {
    try {
      const fws = frameworks.length ? frameworks : await (async () => {
        const res = await fetch(`${API_BASE}/rules/metadata/frameworks`)
        if (!res.ok) throw new Error(await res.text())
        return (await res.json()) as Framework[]
      })()

      for (const fw of fws) {
        const res = await fetch(`${API_BASE}/rules/metadata/frameworks/${fw.id}/controls`)
        if (!res.ok) continue
        const list = (await res.json()) as Control[]
        const found = list.find((c) => c.id === controlId)
        if (found) return found
      }
      return null
    } catch {
      return null
    }
  }

  async function openRuleModal(rule: RuleListItem) {
    setOpenRule(rule)
    setOpenRulePreview(null)
    setOpenRuleControlInfo(null)
    setOpenRulePreviewing(false)

    const info = await resolveControlInfoById(rule.control_id)
    setOpenRuleControlInfo(info)
  }

  async function previewOpenRule() {
    if (!openRule) return
    const ruleObj = openRule.rule || {}
    setOpenRulePreviewing(true)
    try {
      const res = await fetch(`${API_BASE}/rules/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ruleObj),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = (await res.json()) as PreviewResponse
      setOpenRulePreview(data)
    } catch (e: any) {
      setToast({ type: "err", msg: `Preview failed: ${e?.message || e}` })
    } finally {
      setOpenRulePreviewing(false)
    }
  }

  function addConditionRow() {
    setConditions((prev) => [
      ...prev,
      { id: crypto.randomUUID(), field: "", operator: "", value: "" },
    ])
  }

  function removeConditionRow(id: string) {
    setConditions((prev) => prev.filter((c) => c.id !== id))
  }

  function updateConditionRow(id: string, patch: Partial<ConditionRow>) {
    setConditions((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }

  const selectedFieldMeta = useMemo(() => {
    const fields = evidenceFields?.fields || []
    return new Map(fields.map((f) => [f.name, f]))
  }, [evidenceFields])

  const disableCreate = creating || !selectedControlId || !ruleName || ruleName === "New rule" || 
    conditions.filter(c => c.field && c.operator).length === 0

  return (
    <div className="space-y-8">
      {/* Toast */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.msg}
          onDismiss={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-gray-900">Controls Automation</h1>
        <p className="text-sm text-gray-600 max-w-3xl">
          Define rules against live evidence sources to automatically test controls.
          Each enabled rule evaluates a single control and can be previewed before running.
        </p>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard value={enabledRulesCount} label="Enabled rules" />
        <KPICard value={controlsCovered} label="Controls covered" />
        <KPICard value={evidenceSources.length} label="Evidence sources" />
        <KPICard value={integrationsUsed} label="Integrations used" />
      </div>

      {/* Primary Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-gray-600">
          {lastRunAll ? (
            <span>
              Last run: <span className="font-semibold text-gray-900">{lastRunAll.run_id}</span>{" "}
              ({lastRunAll.rules_executed} rules)
            </span>
          ) : (
            <span>Run all enabled rules to persist results for audit and reporting</span>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={loadRules}
            className="px-3 py-2 text-sm font-semibold border rounded-md hover:bg-gray-50 transition-all duration-200 hover:shadow-sm"
            disabled={loadingRules}
          >
            {loadingRules ? "Refreshing…" : "Refresh"}
          </button>

          <button
            onClick={handleRunAll}
            disabled={runningAll || rules.length === 0}
            className={cx(
              "px-4 py-2 text-sm font-semibold border border-yellow-400 bg-yellow-300 text-black rounded-md",
              "hover:bg-black hover:text-white hover:border-black transition-all duration-200 hover:shadow-md",
              (runningAll || rules.length === 0) && "opacity-60 cursor-not-allowed"
            )}
          >
            {runningAll ? "Running…" : "Run All Automations"}
          </button>
        </div>
      </div>

      {/* Rules Table */}
      <div className="border border-gray-200 bg-white rounded-lg overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b bg-gradient-to-r from-gray-50 to-white">
          <h2 className="text-lg font-semibold text-gray-900">Enabled Rules</h2>
          <p className="text-sm text-gray-600 mt-1">
            Active automation rules ready to execute
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Rule</th>
                <th className="px-4 py-3 text-left font-semibold">Integration</th>
                <th className="px-4 py-3 text-left font-semibold">Control ID</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr
                  key={r.id}
                  className="border-t hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                  onClick={() => openRuleModal(r)}
                >
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{r.name}</div>
                    <div className="text-xs text-gray-500 font-mono">{r.id}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{r.integration}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{r.control_id}</td>
                  <td className="px-4 py-3">
                    <StatusPill text="Enabled" />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      className="px-3 py-1.5 text-xs font-semibold border rounded-md hover:bg-gray-50 transition-all duration-200"
                      onClick={(e) => {
                        e.stopPropagation()
                        void openRuleModal(r)
                      }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}

              {!loadingRules && rules.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No enabled rules yet. Create one below to enable automation.
                  </td>
                </tr>
              )}

              {loadingRules && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-gray-600 rounded-full" />
                      Loading rules…
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Rule Panel */}
      <div className="border border-gray-200 bg-white p-6 rounded-lg space-y-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Create Automation Rule</h2>
          <p className="text-sm text-gray-600 mt-1">
            Configure and preview your automation before enabling
          </p>
        </div>

        {/* Control Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Select Control (Master Framework)</label>
          <select
            value={selectedControlId}
            onChange={(e) => setSelectedControlId(e.target.value)}
            className="w-full border border-gray-300 px-3 py-2 rounded-md bg-white focus:ring-2 focus:ring-yellow-300 focus:border-yellow-400 transition-all duration-200"
          >
            <option value="">Select control</option>
            {controls.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          {selectedControlId && (() => {
            const ctrl = controls.find(c => c.id === selectedControlId)
            if (!ctrl) return null
            return (
              <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-md text-xs">
                <div className="font-semibold text-gray-900">{ctrl.code}</div>
                <div className="text-gray-700 mt-1">{ctrl.statement}</div>
              </div>
            )
          })()}
        </div>

        {/* Rule name */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Rule name</label>
          <input
            value={ruleName}
            onChange={(e) => setRuleName(e.target.value)}
            className="w-full border border-gray-300 px-3 py-2 rounded-md focus:ring-2 focus:ring-yellow-300 focus:border-yellow-400 transition-all duration-200"
            placeholder="e.g., TLS grade meets baseline"
          />
        </div>

        {/* Evidence source */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Evidence source</label>
          <select
            value={selectedEvidenceSource}
            onChange={(e) => setSelectedEvidenceSource(e.target.value)}
            className="w-full border border-gray-300 px-3 py-2 rounded-md bg-white focus:ring-2 focus:ring-yellow-300 focus:border-yellow-400 transition-all duration-200"
          >
            {evidenceSources.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          {(() => {
            const src = evidenceSources.find((s) => s.key === selectedEvidenceSource)
            if (!src) return null
            return <p className="text-xs text-gray-600">{src.description}</p>
          })()}
        </div>

        {/* Conditions builder */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Conditions</h3>
              <p className="text-xs text-gray-600 mt-1">
                Define logic using available fields and operators
              </p>
            </div>

            <button
              onClick={addConditionRow}
              className="px-3 py-2 text-sm font-semibold border rounded-md hover:bg-gray-50 transition-all duration-200 hover:shadow-sm"
            >
              + Add condition
            </button>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Field</th>
                  <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Operator</th>
                  <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Value</th>
                  <th className="px-4 py-3 text-left font-semibold whitespace-nowrap w-24"></th>
                </tr>
              </thead>
              <tbody>
                {conditions.map((c) => {
                  const fmeta = selectedFieldMeta.get(c.field)
                  const operators = fmeta?.operators || []
                  const fieldOptions = evidenceFields?.fields || []
                  return (
                    <tr key={c.id} className="border-t hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-4 py-2">
                        <select
                          value={c.field}
                          onChange={(e) => {
                            const nextField = e.target.value
                            const nextMeta = selectedFieldMeta.get(nextField)
                            updateConditionRow(c.id, {
                              field: nextField,
                              operator: nextMeta?.operators?.[0] || "",
                              value: "",
                            })
                          }}
                          className="w-full min-w-[200px] border border-gray-300 px-3 py-2 rounded-md bg-white text-sm focus:ring-2 focus:ring-yellow-300 focus:border-yellow-400 transition-all duration-200"
                        >
                          <option value="">Select field</option>
                          {fieldOptions.map((f) => (
                            <option key={f.name} value={f.name}>
                              {f.name} ({f.type})
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-4 py-2">
                        <select
                          value={c.operator}
                          onChange={(e) => updateConditionRow(c.id, { operator: e.target.value })}
                          className="w-full min-w-[120px] border border-gray-300 px-3 py-2 rounded-md bg-white text-sm focus:ring-2 focus:ring-yellow-300 focus:border-yellow-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={!c.field}
                        >
                          <option value="">Select operator</option>
                          {operators.map((op) => (
                            <option key={op} value={op}>
                              {op}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-4 py-2">
                        {fmeta?.type === "boolean" ? (
                          <select
                            value={c.value}
                            onChange={(e) => updateConditionRow(c.id, { value: e.target.value })}
                            className="w-full min-w-[120px] border border-gray-300 px-3 py-2 rounded-md bg-white text-sm focus:ring-2 focus:ring-yellow-300 focus:border-yellow-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!c.operator}
                          >
                            <option value="">Select value</option>
                            <option value="true">true</option>
                            <option value="false">false</option>
                          </select>
                        ) : (
                          <input
                            value={c.value}
                            onChange={(e) => updateConditionRow(c.id, { value: e.target.value })}
                            className="w-full min-w-[150px] border border-gray-300 px-3 py-2 rounded-md text-sm focus:ring-2 focus:ring-yellow-300 focus:border-yellow-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            placeholder={fmeta?.type === "number" ? "e.g., 42" : "e.g., A+"}
                            disabled={!c.operator}
                          />
                        )}
                      </td>

                      <td className="px-4 py-2">
                        <button
                          onClick={() => removeConditionRow(c.id)}
                          className="w-full px-3 py-2 text-xs font-semibold border rounded-md hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                          disabled={conditions.length <= 1}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Preview + Create buttons */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-4 border-t">
          <div className="text-xs text-gray-600">
            Preview runs the rule without persisting results
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePreviewCurrentRule}
              disabled={previewing || !selectedControlId || conditions.filter(c => c.field && c.operator).length === 0}
              className={cx(
                "px-4 py-2 text-sm font-semibold border rounded-md hover:bg-gray-50 transition-all duration-200 hover:shadow-sm",
                (previewing || !selectedControlId || conditions.filter(c => c.field && c.operator).length === 0) && "opacity-60 cursor-not-allowed"
              )}
            >
              {previewing ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin h-3 w-3 border-2 border-gray-300 border-t-gray-600 rounded-full" />
                  Previewing…
                </span>
              ) : (
                "Preview Rule"
              )}
            </button>

            <button
              onClick={handleCreateRule}
              disabled={disableCreate}
              className={cx(
                "px-4 py-2 text-sm font-semibold border border-yellow-400 bg-yellow-300 text-black rounded-md",
                "hover:bg-black hover:text-white hover:border-black transition-all duration-200 hover:shadow-md hover:-translate-y-0.5",
                disableCreate && "opacity-60 cursor-not-allowed hover:translate-y-0"
              )}
            >
              {creating ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin h-3 w-3 border-2 border-gray-600 border-t-white rounded-full" />
                  Enabling…
                </span>
              ) : (
                "Enable Automation"
              )}
            </button>
          </div>
        </div>

        {/* Preview results (builder) */}
        {builderPreview && (
          <div className="animate-in slide-in-from-top-4 duration-300">
            <ResultsTable
              results={builderPreview.results}
              pass={builderPreview.pass}
              fail={builderPreview.fail}
            />
          </div>
        )}
      </div>

      {/* Rule Details Modal */}
      {openRule && (
        <Modal
          title={openRule.name}
          subtitle={`Integration: ${openRule.integration} · Control ID: ${openRule.control_id}`}
          onClose={() => {
            setOpenRule(null)
            setOpenRuleControlInfo(null)
            setOpenRulePreview(null)
          }}
          actions={
            <button
              onClick={previewOpenRule}
              disabled={openRulePreviewing}
              className={cx(
                "px-3 py-1.5 text-sm font-semibold border border-yellow-400 bg-yellow-300 text-black rounded-md",
                "hover:bg-black hover:text-white hover:border-black transition-all duration-200",
                openRulePreviewing && "opacity-60 cursor-not-allowed"
              )}
            >
              {openRulePreviewing ? "Previewing…" : "Preview Rule"}
            </button>
          }
        >
          <div className="p-6 space-y-6">
            <ControlInfo control={openRuleControlInfo} />
            <JsonViewer data={openRule.rule} />
            {openRulePreview && (
              <div className="animate-in slide-in-from-top-4 duration-300">
                <ResultsTable
                  results={openRulePreview.results}
                  pass={openRulePreview.pass}
                  fail={openRulePreview.fail}
                />
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}