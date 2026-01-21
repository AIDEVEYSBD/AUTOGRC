"use client"

import { useEffect, useState, useRef } from "react"
import {
  fetchAutomations,
  fetchAutomationRuns,
  fetchControlOptions,
  fetchApplicabilityCategoryOptions,
  fetchApplicationOptions,
  fetchIntegrationTableOptions,
  fetchTableColumns,
  fetchQueryPreview,
  fetchAutomationKPIs,
  createAutomation,
  updateAutomation,
  deleteAutomation,
  executeAutomation,
} from "./automations-actions"
import type {
  Automation,
  AutomationRun,
  ControlOption,
  ApplicabilityCategoryOption,
  ApplicationOption,
  IntegrationTableOption,
  TableColumn,
  QueryBuilderState,
  QueryJoin,
  QuerySelect,
  QueryCondition,
  QueryOrderBy,
  QueryPreviewResult,
} from "@/lib/automations.types"
export const dynamic = "force-dynamic"
/* ───────────────────────────────────────────── */
/* Custom Dropdown Component                     */
/* ───────────────────────────────────────────── */

interface CustomSelectOption {
  value: string
  label: string
  description?: string
  badge?: string
}

function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Select an option...",
  disabled = false,
  searchable = false,
  className = "",
}: {
  value: string
  onChange: (value: string) => void
  options: CustomSelectOption[]
  placeholder?: string
  disabled?: boolean
  searchable?: boolean
  className?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchTerm("")
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  const selectedOption = options.find(opt => opt.value === value)
  const filteredOptions = searchable && searchTerm
    ? options.filter(opt => 
        opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opt.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between gap-3 px-4 py-2.5 
          border border-[#cccccc] rounded bg-white text-[#333333]
          transition-colors
          ${isOpen ? "border-[#ffe600]" : "hover:border-[#999999]"}
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        `}
      >
        <div className="flex-1 text-left text-sm">
          {selectedOption ? (
            <div className="flex items-center gap-2">
              <span className="font-medium">{selectedOption.label}</span>
              {selectedOption.badge && (
                <span className="text-xs px-2 py-0.5 rounded bg-[#ffe600] text-[#333333] font-bold">
                  {selectedOption.badge}
                </span>
              )}
            </div>
          ) : (
            <span className="text-[#999999]">{placeholder}</span>
          )}
        </div>
        <span className={`text-[#666666] text-xs transition-transform ${isOpen ? "rotate-180" : ""}`}>▼</span>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-[#ffe600] rounded shadow-lg max-h-80 overflow-hidden">
          {searchable && (
            <div className="p-2 border-b border-[#e5e7eb]">
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="w-full px-3 py-2 text-sm border border-[#cccccc] rounded focus:outline-none focus:border-[#ffe600]"
                autoFocus
              />
            </div>
          )}
          <div className="overflow-y-auto max-h-64">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[#999999]">
                No options found
              </div>
            ) : (
              filteredOptions.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value)
                    setIsOpen(false)
                    setSearchTerm("")
                  }}
                  className={`
                    w-full px-4 py-3 text-left text-sm transition-colors
                    ${value === option.value ? "bg-[#ffe600]/20" : "hover:bg-[#f9f9f9]"}
                  `}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[#333333]">{option.label}</span>
                    {option.badge && (
                      <span className="text-xs px-2 py-0.5 rounded bg-[#ffe600] text-[#333333] font-bold">
                        {option.badge}
                      </span>
                    )}
                  </div>
                  {option.description && (
                    <div className="text-xs text-[#666666] mt-1">{option.description}</div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ───────────────────────────────────────────── */
/* Helper Functions                              */
/* ───────────────────────────────────────────── */

function formatDateTime(dateString: string | null): string {
  if (!dateString) return "Never"
  const date = new Date(dateString)
  return date.toLocaleString()
}

function getStatusColor(status: string): string {
  switch (status) {
    case "Success": return "text-[#00a758]"
    case "Failed": return "text-[#e41f13]"
    case "Running": return "text-[#f59e0b]"
    default: return "text-[#666666]"
  }
}

function generateQuerySQL(query: QueryBuilderState): string {
  const lines: string[] = []

  // SELECT clause
  if (query.selectColumns.length === 0) {
    lines.push("SELECT *")
  } else {
    lines.push("SELECT")
    const selectLines = query.selectColumns.map((col, i) => {
      const isLast = i === query.selectColumns.length - 1
      const expr = col.aggregate 
        ? `${col.aggregate}(${col.expression})` 
        : col.expression
      const alias = col.alias ? ` AS ${col.alias}` : ""
      return `  ${expr}${alias}${isLast ? "" : ","}`
    })
    lines.push(...selectLines)
  }

  // FROM clause
  lines.push(`FROM ${query.fromTable} ${query.fromAlias}`)

  // JOIN clauses
  query.joins.forEach(join => {
    lines.push(`${join.type} JOIN ${join.table} ${join.alias}`)
    lines.push(`  ON ${join.onLeft} = ${join.onRight}`)
  })

  // WHERE clause
  if (query.whereConditions.length > 0) {
    lines.push("WHERE")
    query.whereConditions.forEach((cond, i) => {
      const prefix = i === 0 ? "  " : `  ${cond.logic} `
      const right = ["IS NULL", "IS NOT NULL"].includes(cond.operator) 
        ? "" 
        : ` ${cond.right}`
      lines.push(`${prefix}${cond.left} ${cond.operator}${right}`)
    })
  }

  // GROUP BY clause
  if (query.groupByColumns.length > 0) {
    lines.push(`GROUP BY ${query.groupByColumns.join(", ")}`)
  }

  // HAVING clause
  if (query.havingConditions.length > 0) {
    lines.push("HAVING")
    query.havingConditions.forEach((cond, i) => {
      const prefix = i === 0 ? "  " : `  ${cond.logic} `
      const right = ["IS NULL", "IS NOT NULL"].includes(cond.operator) 
        ? "" 
        : ` ${cond.right}`
      lines.push(`${prefix}${cond.left} ${cond.operator}${right}`)
    })
  }

  // ORDER BY clause
  if (query.orderByColumns.length > 0) {
    const orderCols = query.orderByColumns
      .map(col => `${col.column} ${col.direction}`)
      .join(", ")
    lines.push(`ORDER BY ${orderCols}`)
  }

  return lines.join("\n") + ";"
}

/* ───────────────────────────────────────────── */
/* Main Component                                */
/* ───────────────────────────────────────────── */

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>([])
  const [loading, setLoading] = useState(true)
  const [kpis, setKpis] = useState({
    totalAutomations: 0,
    controlsCovered: 0,
    runs24h: 0,
    successRate: 0,
  })

  // Expanded cards state
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [cardRuns, setCardRuns] = useState<Map<string, AutomationRun[]>>(new Map())
  const [loadingRuns, setLoadingRuns] = useState<Set<string>>(new Set())

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Multi-step modal state
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 4

  // Form data
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    controlId: "",
    applyScope: "AllApplications" as "AllApplications" | "ByApplicability" | "SelectedApplications",
    applicabilityIds: [] as string[],
    applicationIds: [] as string[],
    sqlText: "",
    sourceIntegrations: [] as string[],
    answerPass: "",
    answerFail: "",
  })

  // Query builder state
  const [queryBuilder, setQueryBuilder] = useState<QueryBuilderState>({
    fromTable: "applications",
    fromAlias: "a",
    joins: [],
    selectColumns: [
      { id: crypto.randomUUID(), expression: "a.id", alias: "application_id", aggregate: null },
    ],
    whereConditions: [],
    groupByColumns: [],
    havingConditions: [],
    orderByColumns: [],
  })

  // Query preview state
  const [showPreview, setShowPreview] = useState(false)
  const [previewResult, setPreviewResult] = useState<QueryPreviewResult | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  // Options for dropdowns
  const [controlOptions, setControlOptions] = useState<ControlOption[]>([])
  const [applicabilityOptions, setApplicabilityOptions] = useState<ApplicabilityCategoryOption[]>([])
  const [applicationOptions, setApplicationOptions] = useState<ApplicationOption[]>([])
  const [integrationTables, setIntegrationTables] = useState<IntegrationTableOption[]>([])
  const [availableTables, setAvailableTables] = useState<string[]>([])
  const [tableColumns, setTableColumns] = useState<Map<string, TableColumn[]>>(new Map())

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    // Build available tables list
    const tables = ["applications", ...integrationTables.map(t => t.tableName)]
    setAvailableTables(tables)
  }, [integrationTables])

  async function loadData() {
    try {
      setLoading(true)
      const [automationsData, kpisData, controls, categories, apps, tables] = await Promise.all([
        fetchAutomations(),
        fetchAutomationKPIs(),
        fetchControlOptions(),
        fetchApplicabilityCategoryOptions(),
        fetchApplicationOptions(),
        fetchIntegrationTableOptions(),
      ])
      
      setAutomations(automationsData)
      setKpis(kpisData)
      setControlOptions(controls)
      setApplicabilityOptions(categories)
      setApplicationOptions(apps)
      setIntegrationTables(tables)

      // Preload columns for applications table
      const appColumns = await fetchTableColumns("applications")
      setTableColumns(new Map([["applications", appColumns]]))
    } catch (error) {
      console.error("Failed to load data:", error)
      alert("Failed to load automations")
    } finally {
      setLoading(false)
    }
  }

  async function loadColumnsForTable(tableName: string) {
    if (tableColumns.has(tableName)) return
    
    try {
      const columns = await fetchTableColumns(tableName)
      setTableColumns(new Map(tableColumns).set(tableName, columns))
    } catch (error) {
      console.error(`Failed to load columns for ${tableName}:`, error)
    }
  }

  async function toggleCard(automationId: string) {
    const newExpanded = new Set(expandedCards)
    
    if (expandedCards.has(automationId)) {
      newExpanded.delete(automationId)
      setExpandedCards(newExpanded)
    } else {
      newExpanded.add(automationId)
      setExpandedCards(newExpanded)
      
      if (!cardRuns.has(automationId)) {
        await loadRunsForCard(automationId)
      }
    }
  }

  async function loadRunsForCard(automationId: string) {
    try {
      setLoadingRuns(prev => new Set(prev).add(automationId))
      const runs = await fetchAutomationRuns(automationId, 10)
      setCardRuns(prev => new Map(prev).set(automationId, runs))
    } catch (error) {
      console.error("Failed to load runs:", error)
    } finally {
      setLoadingRuns(prev => {
        const newSet = new Set(prev)
        newSet.delete(automationId)
        return newSet
      })
    }
  }

  function openCreateModal() {
    resetForm()
    setEditingAutomation(null)
    setCurrentStep(1)
    setShowCreateModal(true)
  }

  function openEditModal(automation: Automation) {
    setFormData({
      name: automation.name,
      description: automation.description || "",
      controlId: automation.controlId,
      applyScope: automation.applyScope,
      applicabilityIds: automation.applicabilityIds || [],
      applicationIds: automation.applicationIds || [],
      sqlText: automation.sqlText,
      sourceIntegrations: automation.sourceIntegrations || [],
      answerPass: automation.answerPass,
      answerFail: automation.answerFail,
    })
    setEditingAutomation(automation)
    setCurrentStep(1)
    setShowCreateModal(true)
  }

  function resetForm() {
    setFormData({
      name: "",
      description: "",
      controlId: "",
      applyScope: "AllApplications",
      applicabilityIds: [],
      applicationIds: [],
      sqlText: "",
      sourceIntegrations: [],
      answerPass: "",
      answerFail: "",
    })
    setQueryBuilder({
      fromTable: "applications",
      fromAlias: "a",
      joins: [],
      selectColumns: [
        { id: crypto.randomUUID(), expression: "a.id", alias: "application_id", aggregate: null },
      ],
      whereConditions: [],
      groupByColumns: [],
      havingConditions: [],
      orderByColumns: [],
    })
    setPreviewResult(null)
  }

  function nextStep() {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  function prevStep() {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  function canProceedToNextStep(): boolean {
    switch (currentStep) {
      case 1:
        return !!(formData.name.trim() && formData.controlId)
      case 2:
        if (formData.applyScope === "ByApplicability") {
          return formData.applicabilityIds.length > 0
        }
        if (formData.applyScope === "SelectedApplications") {
          return formData.applicationIds.length > 0
        }
        return true
      case 3:
        return !!formData.sqlText.trim()
      case 4:
        return !!(formData.answerPass.trim() && formData.answerFail.trim())
      default:
        return false
    }
  }

  async function handleSubmit() {
    if (!canProceedToNextStep()) return

    try {
      setSubmitting(true)

      const result = editingAutomation
        ? await updateAutomation(editingAutomation.id, formData)
        : await createAutomation(formData)

      if (result.success) {
        setShowCreateModal(false)
        await loadData()
        alert(editingAutomation ? "Automation updated successfully" : "Automation created successfully")
      } else {
        alert(result.error || "Failed to save automation")
      }
    } catch (error) {
      console.error("Failed to save automation:", error)
      alert("Failed to save automation")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(automation: Automation) {
    if (!confirm(`Are you sure you want to delete "${automation.name}"? This will also delete all associated runs and evidence.`)) {
      return
    }

    try {
      setSubmitting(true)
      const result = await deleteAutomation(automation.id)
      
      if (result.success) {
        await loadData()
        alert("Automation deleted successfully")
      } else {
        alert(result.error || "Failed to delete automation")
      }
    } catch (error) {
      console.error("Failed to delete automation:", error)
      alert("Failed to delete automation")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleExecute(automation: Automation) {
    if (!confirm(`Execute automation "${automation.name}"? This will assess all applicable applications.`)) {
      return
    }

    try {
      setSubmitting(true)
      const result = await executeAutomation(automation.id, "Manual")
      
      if (result.success) {
        alert("Automation executed successfully")
        await loadData()
        if (expandedCards.has(automation.id)) {
          await loadRunsForCard(automation.id)
        }
      } else {
        alert(result.error || "Failed to execute automation")
      }
    } catch (error) {
      console.error("Failed to execute automation:", error)
      alert("Failed to execute automation")
    } finally {
      setSubmitting(false)
    }
  }

  async function handlePreviewQuery() {
    try {
      setLoadingPreview(true)
      const result = await fetchQueryPreview(formData.sqlText, 10)
      setPreviewResult(result)
      setShowPreview(true)
    } catch (error) {
      console.error("Failed to preview query:", error)
      alert("Failed to preview query")
    } finally {
      setLoadingPreview(false)
    }
  }

  function updateQueryFromBuilder() {
    const sql = generateQuerySQL(queryBuilder)
    setFormData(prev => ({ ...prev, sqlText: sql }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-[#666666]">Loading automations...</div>
      </div>
    )
  }

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#333333]">
            Control Automations
          </h1>
          <p className="mt-1 text-base text-[#666666] max-w-4xl">
            Create automated rules to continuously test compliance requirements across your applications.
            Define tests that run automatically to ensure ongoing compliance.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="bg-[#ffe600] text-[#333333] px-6 py-2.5 rounded font-bold transition-colors hover:bg-[#333333] hover:text-white"
        >
          Create Automation
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <KpiCard title="Total Automations" value={kpis.totalAutomations} />
        <KpiCard title="Controls Covered" value={kpis.controlsCovered} />
        <KpiCard title="Runs (24h)" value={kpis.runs24h} />
        <KpiCard title="Success Rate" value={`${kpis.successRate}%`} />
      </div>

      {/* Automations List */}
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-[#333333]">
            Active Automations
          </h2>
          <p className="mt-1 text-base text-[#666666] max-w-4xl">
            View and manage all automation rules. Click on any rule to see execution history and details.
          </p>
        </div>

        {automations.length === 0 ? (
          <div className="rounded-lg border border-[#cccccc] bg-white p-12 text-center shadow-sm">
            <div className="text-[#666666] mb-4">
              No automations created yet. Create your first automation to start automatically testing compliance requirements.
            </div>
            <button
              onClick={openCreateModal}
              className="bg-[#ffe600] text-[#333333] px-6 py-2.5 rounded font-bold transition-colors hover:bg-[#333333] hover:text-white"
            >
              Create First Automation
            </button>
          </div>
        ) : (
          automations.map(automation => {
            const isExpanded = expandedCards.has(automation.id)
            const runs = cardRuns.get(automation.id) || []
            const isLoadingRuns = loadingRuns.has(automation.id)
            const successRate = automation.totalRuns > 0
              ? Math.round((automation.successfulRuns / automation.totalRuns) * 100)
              : 0

            return (
              <div key={automation.id} className="rounded-lg border border-[#cccccc] bg-white shadow-sm">
                {/* Collapsed Header */}
                <div 
                  className="p-6 cursor-pointer hover:bg-[#f9f9f9] transition-colors"
                  onClick={() => toggleCard(automation.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="font-bold text-lg text-[#333333]">{automation.name}</div>
                        {automation.lastRunStatus && (
                          <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                            automation.lastRunStatus === "Success"
                              ? "bg-[#00a758] text-white"
                              : automation.lastRunStatus === "Failed"
                              ? "bg-[#e41f13] text-white"
                              : "bg-[#f59e0b] text-white"
                          }`}>
                            {automation.lastRunStatus.toUpperCase()}
                          </span>
                        )}
                        <span className="text-xs px-2 py-0.5 rounded bg-[#ffe600] text-[#333333] font-bold">
                          {automation.controlCode}
                        </span>
                      </div>
                      <div className="text-sm text-[#666666] mt-1">
                        {automation.controlTitle}
                      </div>
                      <div className="text-sm text-[#666666] mt-1">
                        {automation.applyScope === "AllApplications" && "Applies to: All Applications"}
                        {automation.applyScope === "ByApplicability" && 
                          `Applies to: Applications in ${automation.applicabilityIds?.length || 0} categories`
                        }
                        {automation.applyScope === "SelectedApplications" && 
                          `Applies to: ${automation.applicationIds?.length || 0} selected applications`
                        }
                      </div>
                    </div>
                    <div className="text-[#666666]">
                      {isExpanded ? "▼" : "▶"}
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-[#cccccc] p-6 space-y-6 bg-[#fafafa]">
                    {/* Details */}
                    <div className="space-y-3">
                      {automation.description && (
                        <div className="text-sm text-[#666666]">
                          <span className="font-bold">Description:</span> {automation.description}
                        </div>
                      )}
                      <div className="text-sm text-[#666666]">
                        <span className="font-bold">Last Run:</span> {formatDateTime(automation.lastRunAt)}
                      </div>
                      <div className="text-sm text-[#666666]">
                        <span className="font-bold">Created:</span> {formatDateTime(automation.createdAt)}
                      </div>
                      
                      {/* SQL Query */}
                      <div>
                        <div className="text-sm font-bold text-[#333333] mb-2">SQL Query:</div>
                        <pre className="bg-white border border-[#e5e7eb] rounded p-4 text-xs overflow-x-auto text-[#333333]">
                          {automation.sqlText}
                        </pre>
                      </div>

                      {/* Narratives */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm font-bold text-[#00a758] mb-2">Pass Message:</div>
                          <div className="bg-[#f0fdf4] border border-[#86efac] rounded p-3 text-xs text-[#166534]">
                            {automation.answerPass}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-bold text-[#e41f13] mb-2">Fail Message:</div>
                          <div className="bg-[#fef2f2] border border-[#fca5a5] rounded p-3 text-xs text-[#991b1b]">
                            {automation.answerFail}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 flex-wrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleExecute(automation)
                        }}
                        disabled={submitting}
                        className="text-xs px-4 py-2 rounded bg-[#333333] text-white font-medium hover:bg-[#555555] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {submitting ? "Executing..." : "Execute Now"}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          openEditModal(automation)
                        }}
                        disabled={submitting}
                        className="text-xs px-4 py-2 rounded border border-[#cccccc] text-[#333333] hover:bg-white transition-colors font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        Edit Automation
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(automation)
                        }}
                        disabled={submitting}
                        className="text-xs px-4 py-2 rounded border border-[#e41f13] text-[#e41f13] hover:bg-[#e41f13] hover:text-white transition-colors font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        Delete
                      </button>
                    </div>

                    {/* Run History */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-[#333333]">Recent Runs</h3>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            loadRunsForCard(automation.id)
                          }}
                          disabled={isLoadingRuns}
                          className="text-xs px-3 py-1 rounded border border-[#cccccc] text-[#666666] hover:bg-white transition-colors disabled:opacity-60"
                        >
                          {isLoadingRuns ? "Loading..." : "Refresh"}
                        </button>
                      </div>

                      {isLoadingRuns ? (
                        <div className="text-sm text-[#666666] py-4">Loading runs...</div>
                      ) : runs.length === 0 ? (
                        <div className="text-sm text-[#666666] py-4">
                          No runs yet. Execute the automation to see results here.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {runs.map(run => (
                            <div key={run.id} className="bg-white rounded border border-[#e5e7eb] p-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3">
                                    <span className={`text-xs font-bold ${getStatusColor(run.status)}`}>
                                      {run.status}
                                    </span>
                                    <span className="text-xs text-[#999999]">
                                      {run.triggeredBy}
                                    </span>
                                  </div>
                                  <div className="text-xs text-[#666666] mt-1">
                                    Started: {formatDateTime(run.startedAt)}
                                  </div>
                                  {run.finishedAt && (
                                    <div className="text-xs text-[#666666]">
                                      Finished: {formatDateTime(run.finishedAt)}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {run.errorMessage && (
                                <div className="text-xs text-[#e41f13] mt-2 p-2 bg-[#fff5f5] rounded">
                                  {run.errorMessage}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <MultiStepModal
          onClose={() => setShowCreateModal(false)}
          title={editingAutomation ? "Edit Automation" : "Create Automation"}
          currentStep={currentStep}
          totalSteps={totalSteps}
          onNext={nextStep}
          onPrev={prevStep}
          onSubmit={handleSubmit}
          canProceed={canProceedToNextStep()}
          submitting={submitting}
        >
          {currentStep === 1 && (
            <Step1BasicInfo
              formData={formData}
              setFormData={setFormData}
              controlOptions={controlOptions}
            />
          )}
          {currentStep === 2 && (
            <Step2ApplicationScope
              formData={formData}
              setFormData={setFormData}
              applicabilityOptions={applicabilityOptions}
              applicationOptions={applicationOptions}
            />
          )}
          {currentStep === 3 && (
            <Step3QueryBuilder
              formData={formData}
              setFormData={setFormData}
              queryBuilder={queryBuilder}
              setQueryBuilder={setQueryBuilder}
              availableTables={availableTables}
              tableColumns={tableColumns}
              loadColumnsForTable={loadColumnsForTable}
              updateQueryFromBuilder={updateQueryFromBuilder}
              onPreview={handlePreviewQuery}
              loadingPreview={loadingPreview}
            />
          )}
          {currentStep === 4 && (
            <Step4Narratives
              formData={formData}
              setFormData={setFormData}
            />
          )}
        </MultiStepModal>
      )}

      {/* Preview Modal */}
      {showPreview && previewResult && (
        <Modal onClose={() => setShowPreview(false)} wide>
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-[#333333]">Query Preview</h3>
            <p className="mt-1 text-base text-[#666666]">
              Showing {previewResult.rowCount} sample rows
            </p>
          </div>

          {previewResult.error ? (
            <div className="bg-[#fef2f2] border border-[#fca5a5] rounded p-4 text-sm text-[#991b1b]">
              <div className="font-bold mb-2">Error:</div>
              <div>{previewResult.error}</div>
            </div>
          ) : !previewResult.hasApplicationId ? (
            <div className="bg-[#fff7ed] border border-[#fed7aa] rounded p-4 text-sm text-[#9a3412] mb-4">
              <div className="font-bold mb-2">⚠️ Warning:</div>
              <div>
                Query must return a column named <code className="bg-white px-2 py-0.5 rounded">application_id</code> 
                {" "}to be valid. This is required to link assessment evidence to applications.
              </div>
            </div>
          ) : (
            <div className="bg-[#f0fdf4] border border-[#86efac] rounded p-4 text-sm text-[#166534] mb-4">
              <div className="font-bold mb-2">✓ Valid Query</div>
              <div>Query includes required application_id column.</div>
            </div>
          )}

          {previewResult.rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full border border-[#cccccc] text-sm">
                <thead className="bg-[#f9f9f9]">
                  <tr>
                    {previewResult.columns.map(col => (
                      <th key={col} className="border border-[#cccccc] px-4 py-3 text-left font-bold text-[#333333]">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewResult.rows.map((row, i) => (
                    <tr key={i} className="odd:bg-white even:bg-[#fafafa] hover:bg-[#f5f5f5]">
                      {previewResult.columns.map(col => (
                        <td key={col} className="border border-[#e5e7eb] px-4 py-3 text-[#666666]">
                          {row[col] === null || row[col] === undefined
                            ? "—"
                            : typeof row[col] === "boolean"
                            ? row[col] ? "Yes" : "No"
                            : typeof row[col] === "object"
                            ? JSON.stringify(row[col])
                            : String(row[col])
                          }
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}

/* ───────────────────────────────────────────── */
/* Step Components                               */
/* ───────────────────────────────────────────── */

function Step1BasicInfo({
  formData,
  setFormData,
  controlOptions,
}: {
  formData: any
  setFormData: (data: any) => void
  controlOptions: ControlOption[]
}) {
  const controlSelectOptions: CustomSelectOption[] = controlOptions.map(control => ({
    value: control.id,
    label: control.title,
    badge: control.controlCode,
    description: control.statement || "No description available",
  }))

  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-lg font-bold text-[#333333] mb-1">Basic Information</h4>
        <p className="text-sm text-[#666666]">
          Define the name and compliance requirement that this automation will test.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#333333] mb-2">
          Automation Name <span className="text-[#e41f13]">*</span>
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={e => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., TLS 1.3 Support Check"
          className="w-full border border-[#cccccc] rounded px-3 py-2.5 text-[#333333] focus:outline-none focus:ring-2 focus:ring-[#ffe600] focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#333333] mb-2">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={e => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe what this automation tests and how it works..."
          rows={3}
          className="w-full border border-[#cccccc] rounded px-3 py-2.5 text-[#333333] focus:outline-none focus:ring-2 focus:ring-[#ffe600] focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#333333] mb-2">
          Control <span className="text-[#e41f13]">*</span>
        </label>
        <CustomSelect
          value={formData.controlId}
          onChange={(value) => setFormData({ ...formData, controlId: value })}
          options={controlSelectOptions}
          placeholder="Select a control..."
          searchable
        />
        <p className="text-xs text-[#999999] mt-1">
          Select the compliance requirement that this automation will assess
        </p>
      </div>
    </div>
  )
}

function Step2ApplicationScope({
  formData,
  setFormData,
  applicabilityOptions,
  applicationOptions,
}: {
  formData: any
  setFormData: (data: any) => void
  applicabilityOptions: ApplicabilityCategoryOption[]
  applicationOptions: ApplicationOption[]
}) {
  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-lg font-bold text-[#333333] mb-1">Application Scope</h4>
        <p className="text-sm text-[#666666]">
          Define which applications this automation will assess.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#333333] mb-3">
          Apply To <span className="text-[#e41f13]">*</span>
        </label>
        <div className="space-y-2">
          <label className="flex items-start gap-3 p-3 border border-[#cccccc] rounded hover:bg-[#f9f9f9] cursor-pointer">
            <input
              type="radio"
              checked={formData.applyScope === "AllApplications"}
              onChange={() => setFormData({ ...formData, applyScope: "AllApplications" })}
              className="mt-1"
            />
            <div>
              <div className="font-medium text-[#333333]">All Applications</div>
              <div className="text-xs text-[#666666]">
                Run this automation for every application in the system
              </div>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 border border-[#cccccc] rounded hover:bg-[#f9f9f9] cursor-pointer">
            <input
              type="radio"
              checked={formData.applyScope === "ByApplicability"}
              onChange={() => setFormData({ ...formData, applyScope: "ByApplicability" })}
              className="mt-1"
            />
            <div>
              <div className="font-medium text-[#333333]">By Applicability Category</div>
              <div className="text-xs text-[#666666]">
                Run for applications in selected categories (e.g., Internet-facing, Production)
              </div>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 border border-[#cccccc] rounded hover:bg-[#f9f9f9] cursor-pointer">
            <input
              type="radio"
              checked={formData.applyScope === "SelectedApplications"}
              onChange={() => setFormData({ ...formData, applyScope: "SelectedApplications" })}
              className="mt-1"
            />
            <div>
              <div className="font-medium text-[#333333]">Selected Applications</div>
              <div className="text-xs text-[#666666]">
                Run only for specific applications you choose
              </div>
            </div>
          </label>
        </div>
      </div>

      {formData.applyScope === "ByApplicability" && (
        <div>
          <label className="block text-sm font-medium text-[#333333] mb-2">
            Select Categories <span className="text-[#e41f13]">*</span>
          </label>
          <div className="space-y-2 max-h-64 overflow-y-auto border border-[#cccccc] rounded p-3">
            {applicabilityOptions.map(category => (
              <label key={category.id} className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.applicabilityIds.includes(category.id)}
                  onChange={e => {
                    const newIds = e.target.checked
                      ? [...formData.applicabilityIds, category.id]
                      : formData.applicabilityIds.filter((id: string) => id !== category.id)
                    setFormData({ ...formData, applicabilityIds: newIds })
                  }}
                  className="mt-1"
                />
                <div>
                  <div className="text-sm font-medium text-[#333333]">{category.name}</div>
                  {category.description && (
                    <div className="text-xs text-[#666666]">{category.description}</div>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {formData.applyScope === "SelectedApplications" && (
        <div>
          <label className="block text-sm font-medium text-[#333333] mb-2">
            Select Applications <span className="text-[#e41f13]">*</span>
          </label>
          <div className="space-y-2 max-h-64 overflow-y-auto border border-[#cccccc] rounded p-3">
            {applicationOptions.map(app => (
              <label key={app.id} className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.applicationIds.includes(app.id)}
                  onChange={e => {
                    const newIds = e.target.checked
                      ? [...formData.applicationIds, app.id]
                      : formData.applicationIds.filter((id: string) => id !== app.id)
                    setFormData({ ...formData, applicationIds: newIds })
                  }}
                  className="mt-1"
                />
                <div>
                  <div className="text-sm font-medium text-[#333333]">{app.name}</div>
                  <div className="text-xs text-[#666666]">
                    {app.primaryUrl} • {app.criticality}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Step3QueryBuilder({
  formData,
  setFormData,
  queryBuilder,
  setQueryBuilder,
  availableTables,
  tableColumns,
  loadColumnsForTable,
  updateQueryFromBuilder,
  onPreview,
  loadingPreview,
}: {
  formData: any
  setFormData: (data: any) => void
  queryBuilder: QueryBuilderState
  setQueryBuilder: (state: QueryBuilderState) => void
  availableTables: string[]
  tableColumns: Map<string, TableColumn[]>
  loadColumnsForTable: (table: string) => Promise<void>
  updateQueryFromBuilder: () => void
  onPreview: () => void
  loadingPreview: boolean
}) {
  const [useVisualBuilder, setUseVisualBuilder] = useState(false)
  // Track which WHERE conditions are comparing columns vs values
  const [columnComparisonMode, setColumnComparisonMode] = useState<Map<string, boolean>>(new Map())

  // Get all available columns with table prefix
  function getAllAvailableColumns(): CustomSelectOption[] {
    const columns: CustomSelectOption[] = []
    
    // Add columns from FROM table
    const fromCols = tableColumns.get(queryBuilder.fromTable) || []
    fromCols.forEach(col => {
      columns.push({
        value: `${queryBuilder.fromAlias}.${col.columnName}`,
        label: `${queryBuilder.fromAlias}.${col.columnName}`,
        description: `${queryBuilder.fromTable} - ${col.dataType}`,
      })
    })
    
    // Add columns from JOINed tables
    queryBuilder.joins.forEach(join => {
      if (join.table && join.alias) {
        const joinCols = tableColumns.get(join.table) || []
        joinCols.forEach(col => {
          columns.push({
            value: `${join.alias}.${col.columnName}`,
            label: `${join.alias}.${col.columnName}`,
            description: `${join.table} - ${col.dataType}`,
          })
        })
      }
    })
    
    return columns
  }

  function addJoin() {
    const newJoin: QueryJoin = {
      id: crypto.randomUUID(),
      type: "LEFT",
      table: "",
      alias: "",
      onLeft: "",
      onRight: "",
    }
    setQueryBuilder({ ...queryBuilder, joins: [...queryBuilder.joins, newJoin] })
  }

  function updateJoin(id: string, updates: Partial<QueryJoin>) {
    setQueryBuilder({
      ...queryBuilder,
      joins: queryBuilder.joins.map(j => j.id === id ? { ...j, ...updates } : j),
    })
  }

  function removeJoin(id: string) {
    setQueryBuilder({
      ...queryBuilder,
      joins: queryBuilder.joins.filter(j => j.id !== id),
    })
  }

  function addSelect() {
    const newSelect: QuerySelect = {
      id: crypto.randomUUID(),
      expression: "",
      alias: "",
      aggregate: null,
    }
    setQueryBuilder({ ...queryBuilder, selectColumns: [...queryBuilder.selectColumns, newSelect] })
  }

  function updateSelect(id: string, updates: Partial<QuerySelect>) {
    setQueryBuilder({
      ...queryBuilder,
      selectColumns: queryBuilder.selectColumns.map(s => s.id === id ? { ...s, ...updates } : s),
    })
  }

  function removeSelect(id: string) {
    setQueryBuilder({
      ...queryBuilder,
      selectColumns: queryBuilder.selectColumns.filter(s => s.id !== id),
    })
  }

  function addWhere() {
    const newWhere: QueryCondition = {
      id: crypto.randomUUID(),
      logic: queryBuilder.whereConditions.length === 0 ? "AND" : "AND",
      left: "",
      operator: "=",
      right: "",
    }
    setQueryBuilder({ ...queryBuilder, whereConditions: [...queryBuilder.whereConditions, newWhere] })
    // Default to value comparison
    setColumnComparisonMode(new Map(columnComparisonMode).set(newWhere.id, false))
  }

  function updateWhere(id: string, updates: Partial<QueryCondition>) {
    setQueryBuilder({
      ...queryBuilder,
      whereConditions: queryBuilder.whereConditions.map(w => w.id === id ? { ...w, ...updates } : w),
    })
  }

  function removeWhere(id: string) {
    setQueryBuilder({
      ...queryBuilder,
      whereConditions: queryBuilder.whereConditions.filter(w => w.id !== id),
    })
    const newMode = new Map(columnComparisonMode)
    newMode.delete(id)
    setColumnComparisonMode(newMode)
  }

  function toggleComparisonMode(conditionId: string, isColumnMode: boolean) {
    const newMode = new Map(columnComparisonMode)
    newMode.set(conditionId, isColumnMode)
    setColumnComparisonMode(newMode)
    // Clear the right value when switching modes
    updateWhere(conditionId, { right: "" })
  }

  function addGroupBy() {
    const newCol = ""
    setQueryBuilder({ ...queryBuilder, groupByColumns: [...queryBuilder.groupByColumns, newCol] })
  }

  function updateGroupBy(index: number, value: string) {
    const newCols = [...queryBuilder.groupByColumns]
    newCols[index] = value
    setQueryBuilder({ ...queryBuilder, groupByColumns: newCols })
  }

  function removeGroupBy(index: number) {
    setQueryBuilder({
      ...queryBuilder,
      groupByColumns: queryBuilder.groupByColumns.filter((_, i) => i !== index),
    })
  }

  const tableOptions: CustomSelectOption[] = availableTables.map(table => ({
    value: table,
    label: table,
  }))

  const aggregateOptions: CustomSelectOption[] = [
    { value: "", label: "No Aggregate" },
    { value: "COUNT", label: "COUNT", description: "Count number of rows" },
    { value: "SUM", label: "SUM", description: "Sum all values" },
    { value: "AVG", label: "AVG", description: "Average of values" },
    { value: "MIN", label: "MIN", description: "Minimum value" },
    { value: "MAX", label: "MAX", description: "Maximum value" },
    { value: "BOOL_AND", label: "BOOL_AND", description: "True if all values are true" },
    { value: "BOOL_OR", label: "BOOL_OR", description: "True if any value is true" },
    { value: "STRING_AGG", label: "STRING_AGG", description: "Concatenate strings" },
  ]

  const joinTypeOptions: CustomSelectOption[] = [
    { value: "INNER", label: "INNER", description: "Only matching rows from both tables" },
    { value: "LEFT", label: "LEFT", description: "All rows from left table, matching from right" },
    { value: "RIGHT", label: "RIGHT", description: "All rows from right table, matching from left" },
  ]

  const operatorOptions: CustomSelectOption[] = [
    { value: "=", label: "= (equals)" },
    { value: "!=", label: "!= (not equals)" },
    { value: ">", label: "> (greater than)" },
    { value: "<", label: "< (less than)" },
    { value: ">=", label: ">= (greater or equal)" },
    { value: "<=", label: "<= (less or equal)" },
    { value: "LIKE", label: "LIKE (pattern match)" },
    { value: "ILIKE", label: "ILIKE (case-insensitive match)" },
    { value: "IN", label: "IN (in list)" },
    { value: "NOT IN", label: "NOT IN (not in list)" },
    { value: "IS NULL", label: "IS NULL" },
    { value: "IS NOT NULL", label: "IS NOT NULL" },
  ]

  const logicOptions: CustomSelectOption[] = [
    { value: "AND", label: "AND", description: "Both conditions must be true" },
    { value: "OR", label: "OR", description: "Either condition can be true" },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-lg font-bold text-[#333333] mb-1">SQL Query Builder</h4>
        <p className="text-sm text-[#666666]">
          Build the SQL query that will test this control. The query must return an 
          <code className="bg-[#f5f5f5] px-2 py-0.5 rounded mx-1">application_id</code> 
          column to link results to applications.
        </p>
      </div>

      {/* Toggle Visual/Raw */}
      <div className="flex gap-2">
        <button
          onClick={() => setUseVisualBuilder(false)}
          className={`px-4 py-2 rounded font-medium transition-colors ${
            !useVisualBuilder
              ? "bg-[#333333] text-white"
              : "bg-[#f5f5f5] text-[#666666] hover:bg-[#e5e7eb]"
          }`}
        >
          Raw SQL
        </button>
        <button
          onClick={() => {
            setUseVisualBuilder(true)
            if (formData.sqlText) {
              // If SQL exists, keep it
            } else {
              updateQueryFromBuilder()
            }
          }}
          className={`px-4 py-2 rounded font-medium transition-colors ${
            useVisualBuilder
              ? "bg-[#333333] text-white"
              : "bg-[#f5f5f5] text-[#666666] hover:bg-[#e5e7eb]"
          }`}
        >
          Visual Builder
        </button>
      </div>

      {useVisualBuilder ? (
        <div className="space-y-4 border border-[#cccccc] rounded p-4 bg-[#fafafa]">
          {/* FROM */}
          <div>
            <label className="block text-sm font-bold text-[#333333] mb-2">FROM Table</label>
            <div className="flex gap-2">
              <CustomSelect
                value={queryBuilder.fromTable}
                onChange={async (value) => {
                  setQueryBuilder({ ...queryBuilder, fromTable: value })
                  await loadColumnsForTable(value)
                }}
                options={tableOptions}
                placeholder="Select table..."
                className="flex-1"
              />
              <input
                type="text"
                value={queryBuilder.fromAlias}
                onChange={e => setQueryBuilder({ ...queryBuilder, fromAlias: e.target.value })}
                placeholder="Alias (e.g., a)"
                className="w-24 border border-[#cccccc] rounded px-3 py-2 text-sm text-[#333333]"
              />
            </div>
          </div>

          {/* JOINs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-[#333333]">JOIN Tables</label>
              <button
                onClick={addJoin}
                className="text-xs px-3 py-1 rounded bg-[#ffe600] text-[#333333] font-bold hover:bg-[#333333] hover:text-white transition-colors"
              >
                + Add Join
              </button>
            </div>
            {queryBuilder.joins.length === 0 ? (
              <div className="text-sm text-[#999999] italic">No joins added</div>
            ) : (
              <div className="space-y-3">
                {queryBuilder.joins.map(join => {
                  const allColumns = getAllAvailableColumns()
                  
                  return (
                    <div key={join.id} className="bg-white p-3 rounded border border-[#e5e7eb] space-y-2">
                      <div className="flex gap-2 items-start">
                        <CustomSelect
                          value={join.type}
                          onChange={value => updateJoin(join.id, { type: value as any })}
                          options={joinTypeOptions}
                          placeholder="Type"
                          className="w-32"
                        />
                        <CustomSelect
                          value={join.table}
                          onChange={async (value) => {
                            updateJoin(join.id, { table: value })
                            await loadColumnsForTable(value)
                          }}
                          options={tableOptions}
                          placeholder="Select table..."
                          className="flex-1"
                        />
                        <input
                          type="text"
                          value={join.alias}
                          onChange={e => updateJoin(join.id, { alias: e.target.value })}
                          placeholder="Alias"
                          className="w-20 border border-[#cccccc] rounded px-2 py-1 text-sm"
                        />
                        <button
                          onClick={() => removeJoin(join.id)}
                          className="text-[#e41f13] hover:text-[#991b1b] font-bold text-lg"
                        >
                          ×
                        </button>
                      </div>
                      <div className="flex gap-2 items-center pl-2">
                        <span className="text-xs text-[#666666] font-bold">ON</span>
                        <CustomSelect
                          value={join.onLeft}
                          onChange={value => updateJoin(join.id, { onLeft: value })}
                          options={allColumns}
                          placeholder="Left column"
                          searchable
                          className="flex-1"
                        />
                        <span className="text-sm text-[#666666]">=</span>
                        <CustomSelect
                          value={join.onRight}
                          onChange={value => updateJoin(join.id, { onRight: value })}
                          options={allColumns}
                          placeholder="Right column"
                          searchable
                          className="flex-1"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* SELECT */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-[#333333]">SELECT Columns</label>
              <button
                onClick={addSelect}
                className="text-xs px-3 py-1 rounded bg-[#ffe600] text-[#333333] font-bold hover:bg-[#333333] hover:text-white transition-colors"
              >
                + Add Column
              </button>
            </div>
            <div className="space-y-2">
              {queryBuilder.selectColumns.map(sel => {
                const allColumns = getAllAvailableColumns()
                
                return (
                  <div key={sel.id} className="flex gap-2 items-start bg-white p-3 rounded border border-[#e5e7eb]">
                    <CustomSelect
                      value={sel.aggregate || ""}
                      onChange={value => updateSelect(sel.id, { aggregate: value || null as any })}
                      options={aggregateOptions}
                      placeholder="Aggregate"
                      className="w-40"
                    />
                    <CustomSelect
                      value={sel.expression}
                      onChange={value => updateSelect(sel.id, { expression: value })}
                      options={allColumns}
                      placeholder="Select column..."
                      searchable
                      className="flex-1"
                    />
                    <input
                      type="text"
                      value={sel.alias}
                      onChange={e => updateSelect(sel.id, { alias: e.target.value })}
                      placeholder="Alias"
                      className="w-32 border border-[#cccccc] rounded px-2 py-1 text-sm"
                    />
                    <button
                      onClick={() => removeSelect(sel.id)}
                      className="text-[#e41f13] hover:text-[#991b1b] font-bold text-lg"
                      disabled={queryBuilder.selectColumns.length === 1}
                    >
                      ×
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* WHERE */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-[#333333]">WHERE Conditions</label>
              <button
                onClick={addWhere}
                className="text-xs px-3 py-1 rounded bg-[#ffe600] text-[#333333] font-bold hover:bg-[#333333] hover:text-white transition-colors"
              >
                + Add Condition
              </button>
            </div>
            {queryBuilder.whereConditions.length === 0 ? (
              <div className="text-sm text-[#999999] italic">No conditions added</div>
            ) : (
              <div className="space-y-2">
                {queryBuilder.whereConditions.map((cond, i) => {
                  const allColumns = getAllAvailableColumns()
                  const isColumnMode = columnComparisonMode.get(cond.id) || false
                  
                  return (
                    <div key={cond.id} className="bg-white p-3 rounded border border-[#e5e7eb] space-y-2">
                      <div className="flex gap-2 items-start">
                        {i > 0 && (
                          <CustomSelect
                            value={cond.logic}
                            onChange={value => updateWhere(cond.id, { logic: value as any })}
                            options={logicOptions}
                            className="w-24"
                          />
                        )}
                        <CustomSelect
                          value={cond.left}
                          onChange={value => updateWhere(cond.id, { left: value })}
                          options={allColumns}
                          placeholder="Select column..."
                          searchable
                          className="flex-1"
                        />
                        <CustomSelect
                          value={cond.operator}
                          onChange={value => updateWhere(cond.id, { operator: value as any })}
                          options={operatorOptions}
                          className="w-44"
                        />
                        <button
                          onClick={() => removeWhere(cond.id)}
                          className="text-[#e41f13] hover:text-[#991b1b] font-bold text-lg"
                        >
                          ×
                        </button>
                      </div>
                      
                      {!["IS NULL", "IS NOT NULL"].includes(cond.operator) && (
                        <div className="pl-2">
                          <div className="flex gap-2 mb-2">
                            <button
                              onClick={() => toggleComparisonMode(cond.id, false)}
                              className={`text-xs px-3 py-1 rounded transition-colors ${
                                !isColumnMode
                                  ? "bg-[#333333] text-white"
                                  : "bg-[#f5f5f5] text-[#666666] hover:bg-[#e5e7eb]"
                              }`}
                            >
                              Compare to Value
                            </button>
                            <button
                              onClick={() => toggleComparisonMode(cond.id, true)}
                              className={`text-xs px-3 py-1 rounded transition-colors ${
                                isColumnMode
                                  ? "bg-[#333333] text-white"
                                  : "bg-[#f5f5f5] text-[#666666] hover:bg-[#e5e7eb]"
                              }`}
                            >
                              Compare to Column
                            </button>
                          </div>
                          {isColumnMode ? (
                            <CustomSelect
                              value={cond.right}
                              onChange={value => updateWhere(cond.id, { right: value })}
                              options={allColumns}
                              placeholder="Select column to compare..."
                              searchable
                              className="w-full"
                            />
                          ) : (
                            <input
                              type="text"
                              value={cond.right}
                              onChange={e => updateWhere(cond.id, { right: e.target.value })}
                              placeholder="Enter value (e.g., 'text', 100, true)"
                              className="w-full border border-[#cccccc] rounded px-3 py-2 text-sm"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* GROUP BY */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-[#333333]">GROUP BY Columns</label>
              <button
                onClick={addGroupBy}
                className="text-xs px-3 py-1 rounded bg-[#ffe600] text-[#333333] font-bold hover:bg-[#333333] hover:text-white transition-colors"
              >
                + Add Column
              </button>
            </div>
            {queryBuilder.groupByColumns.length === 0 ? (
              <div className="text-sm text-[#999999] italic">No group by columns (required if using aggregates)</div>
            ) : (
              <div className="space-y-2">
                {queryBuilder.groupByColumns.map((col, i) => {
                  const allColumns = getAllAvailableColumns()
                  
                  return (
                    <div key={i} className="flex gap-2 items-start bg-white p-3 rounded border border-[#e5e7eb]">
                      <CustomSelect
                        value={col}
                        onChange={value => updateGroupBy(i, value)}
                        options={allColumns}
                        placeholder="Select column..."
                        searchable
                        className="flex-1"
                      />
                      <button
                        onClick={() => removeGroupBy(i)}
                        className="text-[#e41f13] hover:text-[#991b1b] font-bold text-lg"
                      >
                        ×
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
            <p className="text-xs text-[#999999] mt-1">
              If using aggregate functions (COUNT, BOOL_AND, etc.), list all non-aggregated SELECT columns here
            </p>
          </div>

          {/* Generate SQL Button */}
          <button
            onClick={updateQueryFromBuilder}
            className="w-full bg-[#333333] text-white px-4 py-2.5 rounded font-bold hover:bg-[#555555] transition-colors"
          >
            Generate SQL from Builder
          </button>
        </div>
      ) : null}

      {/* SQL Text Editor (Always Shown) */}
      <div>
        <label className="block text-sm font-bold text-[#333333] mb-2">
          SQL Query <span className="text-[#e41f13]">*</span>
        </label>
        <textarea
          value={formData.sqlText}
          onChange={e => setFormData({ ...formData, sqlText: e.target.value })}
          placeholder="SELECT a.id AS application_id, ... FROM applications a ..."
          rows={10}
          className="w-full border border-[#cccccc] rounded px-3 py-2.5 text-sm font-mono text-[#333333] focus:outline-none focus:ring-2 focus:ring-[#ffe600] focus:border-transparent"
        />
        <p className="text-xs text-[#999999] mt-1">
          Query must return a column named "application_id" to link results to applications
        </p>
      </div>

      {/* Preview Button */}
      <button
        onClick={onPreview}
        disabled={loadingPreview || !formData.sqlText.trim()}
        className="w-full bg-[#ffe600] text-[#333333] px-4 py-2.5 rounded font-bold hover:bg-[#333333] hover:text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loadingPreview ? "Loading Preview..." : "Preview Query Results"}
      </button>
    </div>
  )
}

function Step4Narratives({
  formData,
  setFormData,
}: {
  formData: any
  setFormData: (data: any) => void
}) {
  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-lg font-bold text-[#333333] mb-1">Result Narratives</h4>
        <p className="text-sm text-[#666666]">
          Define the messages that will be shown when the test passes or fails for an application.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#333333] mb-2">
          Pass Message <span className="text-[#e41f13]">*</span>
        </label>
        <textarea
          value={formData.answerPass}
          onChange={e => setFormData({ ...formData, answerPass: e.target.value })}
          placeholder="e.g., All endpoints for {{host}} support TLS 1.3 encryption, meeting {{control_code}} requirements."
          rows={3}
          className="w-full border border-[#cccccc] rounded px-3 py-2.5 text-[#333333] focus:outline-none focus:ring-2 focus:ring-[#ffe600] focus:border-transparent"
        />
        <p className="text-xs text-[#999999] mt-1">
          Message shown when the test passes. Use templates if needed (e.g., {"{{"} host {"}}"}

)
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#333333] mb-2">
          Fail Message <span className="text-[#e41f13]">*</span>
        </label>
        <textarea
          value={formData.answerFail}
          onChange={e => setFormData({ ...formData, answerFail: e.target.value })}
          placeholder="e.g., Some endpoints for {{host}} do not support TLS 1.3, violating {{control_code}} requirements."
          rows={3}
          className="w-full border border-[#cccccc] rounded px-3 py-2.5 text-[#333333] focus:outline-none focus:ring-2 focus:ring-[#ffe600] focus:border-transparent"
        />
        <p className="text-xs text-[#999999] mt-1">
          Message shown when the test fails. Use templates if needed (e.g., {"{{"} host {"}}"}

)
        </p>
      </div>

      <div className="bg-[#f0f9ff] border border-[#bae6fd] rounded p-4">
        <div className="text-sm font-bold text-[#0c4a6e] mb-2">Preview: Pass</div>
        <div className="text-sm text-[#0c4a6e] bg-white rounded p-3 mb-3">
          {formData.answerPass || <span className="italic text-[#94a3b8]">Pass message will appear here...</span>}
        </div>

        <div className="text-sm font-bold text-[#0c4a6e] mb-2">Preview: Fail</div>
        <div className="text-sm text-[#0c4a6e] bg-white rounded p-3">
          {formData.answerFail || <span className="italic text-[#94a3b8]">Fail message will appear here...</span>}
        </div>
      </div>
    </div>
  )
}

/* ───────────────────────────────────────────── */
/* UI Components                                 */
/* ───────────────────────────────────────────── */

function KpiCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-[#cccccc] bg-white p-6 shadow-sm">
      <div className="text-sm font-medium text-[#666666] uppercase tracking-wide">
        {title}
      </div>
      <div className="mt-3 text-4xl font-bold text-[#333333]">
        {value}
      </div>
    </div>
  )
}

function Modal({
  children,
  onClose,
  wide,
}: {
  children: React.ReactNode
  onClose: () => void
  wide?: boolean
}) {
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        className={[
          "relative bg-white rounded-lg shadow-lg w-full",
          wide ? "max-w-5xl" : "max-w-xl",
          "max-h-[90vh] flex flex-col",
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-2xl font-bold text-[#666666] hover:text-[#333333] transition-colors z-10"
          title="Close"
        >
          ×
        </button>

        <div className="overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  )
}

function MultiStepModal({
  children,
  onClose,
  title,
  currentStep,
  totalSteps,
  onNext,
  onPrev,
  onSubmit,
  canProceed,
  submitting,
}: {
  children: React.ReactNode
  onClose: () => void
  title: string
  currentStep: number
  totalSteps: number
  onNext: () => void
  onPrev: () => void
  onSubmit: () => void
  canProceed: boolean
  submitting: boolean
}) {
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-lg shadow-lg w-full max-w-3xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-2xl font-bold text-[#666666] hover:text-[#333333] transition-colors z-10"
          title="Close"
        >
          ×
        </button>

        {/* Header */}
        <div className="p-6 border-b border-[#e5e7eb]">
          <h3 className="text-2xl font-bold text-[#333333] mb-4">{title}</h3>
          
          {/* Progress Bar */}
          <div className="flex items-center gap-2">
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map(step => (
              <div key={step} className="flex-1">
                <div className={`h-2 rounded ${
                  step <= currentStep ? "bg-[#ffe600]" : "bg-[#e5e7eb]"
                }`} />
              </div>
            ))}
          </div>
          <div className="mt-2 text-sm text-[#666666]">
            Step {currentStep} of {totalSteps}
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 flex-1">
          {children}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#e5e7eb] flex justify-between">
          <button
            onClick={onPrev}
            disabled={currentStep === 1 || submitting}
            className="px-5 py-2.5 rounded border border-[#cccccc] text-[#333333] hover:bg-[#f5f5f5] transition-colors font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-5 py-2.5 rounded border border-[#cccccc] text-[#333333] hover:bg-[#f5f5f5] transition-colors font-medium disabled:opacity-60"
            >
              Cancel
            </button>

            {currentStep < totalSteps ? (
              <button
                onClick={onNext}
                disabled={!canProceed || submitting}
                className="px-5 py-2.5 rounded bg-[#333333] text-white font-medium hover:bg-[#555555] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Next
              </button>
            ) : (
              <button
                onClick={onSubmit}
                disabled={!canProceed || submitting}
                className="px-5 py-2.5 rounded bg-[#ffe600] text-[#333333] font-bold hover:bg-[#333333] hover:text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? "Saving..." : "Create Automation"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}