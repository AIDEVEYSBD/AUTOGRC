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
          border border-md-outline-variant rounded-lg bg-md-surface text-md-on-surface
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
                <span className="text-xs px-2 py-0.5 rounded bg-md-primary-container text-md-on-primary-container font-bold">
                  {selectedOption.badge}
                </span>
              )}
            </div>
          ) : (
            <span className="text-md-on-surface-variant">{placeholder}</span>
          )}
        </div>
        <span className={`text-md-on-surface-variant text-xs transition-transform ${isOpen ? "rotate-180" : ""}`}>▼</span>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-md-surface-container border border-md-primary-container rounded-xl shadow-lg max-h-80 overflow-hidden">
          {searchable && (
            <div className="p-2 border-b border-md-outline-variant">
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="w-full px-3 py-2 text-sm border border-md-outline-variant rounded focus:outline-none focus:border-[#ffe600]"
                autoFocus
              />
            </div>
          )}
          <div className="overflow-y-auto max-h-64">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-md-on-surface-variant">
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
                    ${value === option.value ? "bg-md-primary-container/20" : "hover:bg-md-surface-container-high"}
                  `}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-md-on-surface">{option.label}</span>
                    {option.badge && (
                      <span className="text-xs px-2 py-0.5 rounded bg-md-primary-container text-md-on-primary-container font-bold">
                        {option.badge}
                      </span>
                    )}
                  </div>
                  {option.description && (
                    <div className="text-xs text-md-on-surface-variant mt-1">{option.description}</div>
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
    default: return "text-md-on-surface-variant"
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
    answerTemplate: "",
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
      answerTemplate: automation.answerTemplate || automation.answerPass || "",
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
      answerTemplate: "",
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
        return !!formData.answerTemplate.trim()
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
        <div className="text-lg text-md-on-surface-variant">Loading automations...</div>
      </div>
    )
  }

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-md-on-surface">
            Control Automations
          </h1>
          <p className="mt-1 text-base text-md-on-surface-variant max-w-4xl">
            Create automated rules to continuously test compliance requirements across your applications.
            Define tests that run automatically to ensure ongoing compliance with percentage-based scoring.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex-shrink-0 bg-md-primary-container text-md-on-primary-container px-6 py-2.5 rounded-lg font-bold transition-colors hover:bg-md-primary hover:text-md-on-primary"
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
          <h2 className="text-2xl font-bold text-md-on-surface">
            Active Automations
          </h2>
          <p className="mt-1 text-base text-md-on-surface-variant max-w-4xl">
            View and manage all automation rules. Click on any rule to see execution history and details.
          </p>
        </div>

        {automations.length === 0 ? (
          <div className="rounded-xl border border-md-outline-variant bg-md-surface-container p-12 text-center shadow-sm">
            <div className="text-md-on-surface-variant mb-4">
              No automations created yet. Create your first automation to start automatically testing compliance requirements.
            </div>
            <button
              onClick={openCreateModal}
              className="bg-md-primary-container text-md-on-primary-container px-6 py-2.5 rounded-lg font-bold transition-colors hover:bg-md-primary hover:text-md-on-primary"
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
              <div key={automation.id} className="rounded-xl border border-md-outline-variant bg-md-surface-container shadow-sm">
                {/* Collapsed Header */}
                <div 
                  className="p-6 cursor-pointer hover:bg-md-surface-container-high transition-colors"
                  onClick={() => toggleCard(automation.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="font-bold text-lg text-md-on-surface">{automation.name}</div>
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
                        <span className="text-xs px-2 py-0.5 rounded bg-md-primary-container text-md-on-primary-container font-bold">
                          {automation.controlCode}
                        </span>
                      </div>
                      <div className="text-sm text-md-on-surface-variant mt-1">
                        {automation.controlTitle}
                      </div>
                      <div className="text-sm text-md-on-surface-variant mt-1">
                        {automation.applyScope === "AllApplications" && "Applies to: All Applications"}
                        {automation.applyScope === "ByApplicability" && 
                          `Applies to: Applications in ${automation.applicabilityIds?.length || 0} categories`
                        }
                        {automation.applyScope === "SelectedApplications" && 
                          `Applies to: ${automation.applicationIds?.length || 0} selected applications`
                        }
                      </div>
                    </div>
                    <div className="text-md-on-surface-variant">
                      {isExpanded ? "▼" : "▶"}
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-md-outline-variant p-6 space-y-6 bg-md-surface">
                    {/* Details */}
                    <div className="space-y-3">
                      {automation.description && (
                        <div className="text-sm text-md-on-surface-variant">
                          <span className="font-bold">Description:</span> {automation.description}
                        </div>
                      )}
                      <div className="text-sm text-md-on-surface-variant">
                        <span className="font-bold">Last Run:</span> {formatDateTime(automation.lastRunAt)}
                      </div>
                      <div className="text-sm text-md-on-surface-variant">
                        <span className="font-bold">Created:</span> {formatDateTime(automation.createdAt)}
                      </div>
                      
                      {/* SQL Query */}
                      <div>
                        <div className="text-sm font-bold text-md-on-surface mb-2">SQL Query:</div>
                        <pre className="bg-md-surface border border-md-outline-variant rounded-lg p-4 text-xs overflow-x-auto text-md-on-surface">
                          {automation.sqlText}
                        </pre>
                      </div>

                      {/* Answer Template */}
                      <div>
                        <div className="text-sm font-bold text-md-on-surface mb-2">Result Template:</div>
                        <div className="bg-[#00a758]/10 border border-[#00a758] rounded-lg p-3 text-sm text-[#00a758]">
                          {automation.answerTemplate || automation.answerPass || "No template configured"}
                        </div>
                        <div className="text-xs text-md-on-surface-variant mt-1">
                          Template supports placeholders: {"{{compliance_percentage}}"}, {"{{total_rows}}"}, {"{{compliant_rows}}"}, {"{{partial_gap_rows}}"}, {"{{non_compliant_rows}}"}, {"{{application_name}}"}, {"{{host}}"}, {"{{control_code}}"}
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
                        className="text-xs px-4 py-2 rounded-lg bg-md-primary text-md-on-primary font-medium hover:opacity-90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {submitting ? "Executing..." : "Execute Now"}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          openEditModal(automation)
                        }}
                        disabled={submitting}
                        className="text-xs px-4 py-2 rounded-lg border border-md-outline-variant text-md-on-surface hover:bg-md-surface-container-high transition-colors font-medium disabled:opacity-60 disabled:cursor-not-allowed"
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
                        <h3 className="font-bold text-md-on-surface">Recent Runs</h3>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            loadRunsForCard(automation.id)
                          }}
                          disabled={isLoadingRuns}
                          className="text-xs px-3 py-1 rounded-lg border border-md-outline-variant text-md-on-surface-variant hover:bg-md-surface-container-high transition-colors disabled:opacity-60"
                        >
                          {isLoadingRuns ? "Loading..." : "Refresh"}
                        </button>
                      </div>

                      {isLoadingRuns ? (
                        <div className="text-sm text-md-on-surface-variant py-4">Loading runs...</div>
                      ) : runs.length === 0 ? (
                        <div className="text-sm text-md-on-surface-variant py-4">
                          No runs yet. Execute the automation to see results here.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {runs.map(run => (
                            <div key={run.id} className="bg-md-surface rounded-lg border border-md-outline-variant p-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3">
                                    <span className={`text-xs font-bold ${getStatusColor(run.status)}`}>
                                      {run.status}
                                    </span>
                                    <span className="text-xs text-md-on-surface-variant">
                                      {run.triggeredBy}
                                    </span>
                                  </div>
                                  <div className="text-xs text-md-on-surface-variant mt-1">
                                    Started: {formatDateTime(run.startedAt)}
                                  </div>
                                  {run.finishedAt && (
                                    <div className="text-xs text-md-on-surface-variant">
                                      Finished: {formatDateTime(run.finishedAt)}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {run.errorMessage && (
                                <div className="text-xs text-[#e41f13] mt-2 p-2 bg-[#e41f13]/10 rounded">
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
            <Step4ResultTemplate
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
            <h3 className="text-2xl font-bold text-md-on-surface">Query Preview</h3>
            <p className="mt-1 text-base text-md-on-surface-variant">
              Showing {previewResult.rowCount} sample rows
            </p>
          </div>

          {previewResult.error ? (
            <div className="bg-[#e41f13]/10 border border-[#e41f13] rounded-lg p-4 text-sm text-[#e41f13]">
              <div className="font-bold mb-2">Error:</div>
              <div>{previewResult.error}</div>
            </div>
          ) : (
            <>
              {/* Validation Messages */}
              {!previewResult.hasApplicationId && (
                <div className="bg-[#f59e0b]/10 border border-[#f59e0b] rounded-lg p-4 text-sm text-[#f59e0b] mb-4">
                  <div className="font-bold mb-2">⚠️ Missing Required Column:</div>
                  <div>
                    Query must return a column named <code className="bg-md-surface px-2 py-0.5 rounded">application_id</code>
                    {" "}to link assessment evidence to applications.
                  </div>
                </div>
              )}

              {!previewResult.hasCompliancePercentage && (
                <div className="bg-[#f59e0b]/10 border border-[#f59e0b] rounded-lg p-4 text-sm text-[#f59e0b] mb-4">
                  <div className="font-bold mb-2">⚠️ Missing Required Column:</div>
                  <div>
                    Query must return a column named <code className="bg-md-surface px-2 py-0.5 rounded">compliance_percentage</code>
                    {" "}for percentage-based scoring.
                  </div>
                </div>
              )}

              {previewResult.hasApplicationId && previewResult.hasCompliancePercentage && (
                <div className="bg-[#00a758]/10 border border-[#00a758] rounded-lg p-4 text-sm text-[#00a758] mb-4">
                  <div className="font-bold mb-2">✓ Valid Query</div>
                  <div>Query includes all required columns (application_id, compliance_percentage).</div>
                  
                  {previewResult.previewData && (
                    <div className="mt-3 pt-3 border-t border-[#86efac]">
                      <div className="font-bold mb-1">Preview Compliance Assessment:</div>
                      <div className="flex items-center gap-4 text-xs mb-2">
                        <span>Average: <strong>{previewResult.previewData.averageCompliance}%</strong></span>
                        <span className={`px-2 py-0.5 rounded font-bold ${
                          previewResult.previewData.predictedStatus === "Compliant"
                            ? "bg-[#00a758] text-white"
                            : previewResult.previewData.predictedStatus === "Partial Gap"
                            ? "bg-[#f59e0b] text-white"
                            : "bg-[#e41f13] text-white"
                        }`}>
                          {previewResult.previewData.predictedStatus.toUpperCase()}
                        </span>
                      </div>
                      {previewResult.previewData.rowCounts && (
                        <div className="text-xs text-[#166534] mb-2">
                          <strong>Breakdown:</strong> {previewResult.previewData.rowCounts.compliantRows} compliant, {previewResult.previewData.rowCounts.partialGapRows} partial gap, {previewResult.previewData.rowCounts.nonCompliantRows} non-compliant out of {previewResult.previewData.rowCounts.totalRows} total rows
                        </div>
                      )}
                      <div className="text-xs text-[#166534] mt-2">
                        Thresholds: Compliant ({previewResult.previewData.thresholdInfo.compliant}), 
                        Partial Gap ({previewResult.previewData.thresholdInfo.partial_gap}), 
                        Not Compliant ({previewResult.previewData.thresholdInfo.not_compliant})
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {previewResult.rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full border border-md-outline-variant text-sm">
                <thead className="bg-md-surface-container">
                  <tr>
                    {previewResult.columns.map(col => (
                      <th key={col} className="border border-md-outline-variant px-4 py-3 text-left font-bold text-md-on-surface">
                        {col}
                        {col === "compliance_percentage" && (
                          <span className="ml-2 text-xs px-2 py-0.5 rounded bg-md-primary-container text-md-on-primary-container font-bold">
                            REQUIRED
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewResult.rows.map((row, i) => (
                    <tr key={i} className="odd:bg-md-surface-container even:bg-md-surface hover:bg-md-surface-container-high">
                      {previewResult.columns.map(col => (
                        <td key={col} className="border border-md-outline-variant px-4 py-3 text-md-on-surface-variant">
                          {row[col] === null || row[col] === undefined
                            ? "—"
                            : typeof row[col] === "boolean"
                            ? row[col] ? "Yes" : "No"
                            : typeof row[col] === "number" && col === "compliance_percentage"
                            ? `${row[col]}%`
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
        <h4 className="text-lg font-bold text-md-on-surface mb-1">Basic Information</h4>
        <p className="text-sm text-md-on-surface-variant">
          Define the name and compliance requirement that this automation will test.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-md-on-surface mb-2">
          Automation Name <span className="text-[#e41f13]">*</span>
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={e => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., TLS 1.3 Compliance Check"
          className="w-full border border-md-outline-variant rounded px-3 py-2.5 text-md-on-surface focus:outline-none focus:ring-2 focus:ring-[#ffe600] focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-md-on-surface mb-2">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={e => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe what this automation tests and how it works..."
          rows={3}
          className="w-full border border-md-outline-variant rounded px-3 py-2.5 text-md-on-surface focus:outline-none focus:ring-2 focus:ring-[#ffe600] focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-md-on-surface mb-2">
          Control <span className="text-[#e41f13]">*</span>
        </label>
        <CustomSelect
          value={formData.controlId}
          onChange={(value) => setFormData({ ...formData, controlId: value })}
          options={controlSelectOptions}
          placeholder="Select a control..."
          searchable
        />
        <p className="text-xs text-md-on-surface-variant mt-1">
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
        <h4 className="text-lg font-bold text-md-on-surface mb-1">Application Scope</h4>
        <p className="text-sm text-md-on-surface-variant">
          Define which applications this automation will assess.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-md-on-surface mb-3">
          Apply To <span className="text-[#e41f13]">*</span>
        </label>
        <div className="space-y-2">
          <label className="flex items-start gap-3 p-3 border border-md-outline-variant rounded hover:bg-md-surface-container-high cursor-pointer">
            <input
              type="radio"
              checked={formData.applyScope === "AllApplications"}
              onChange={() => setFormData({ ...formData, applyScope: "AllApplications" })}
              className="mt-1"
            />
            <div>
              <div className="font-medium text-md-on-surface">All Applications</div>
              <div className="text-xs text-md-on-surface-variant">
                Run this automation for every application in the system
              </div>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 border border-md-outline-variant rounded hover:bg-md-surface-container-high cursor-pointer">
            <input
              type="radio"
              checked={formData.applyScope === "ByApplicability"}
              onChange={() => setFormData({ ...formData, applyScope: "ByApplicability" })}
              className="mt-1"
            />
            <div>
              <div className="font-medium text-md-on-surface">By Applicability Category</div>
              <div className="text-xs text-md-on-surface-variant">
                Run for applications in selected categories (e.g., Internet-facing, Production)
              </div>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 border border-md-outline-variant rounded hover:bg-md-surface-container-high cursor-pointer">
            <input
              type="radio"
              checked={formData.applyScope === "SelectedApplications"}
              onChange={() => setFormData({ ...formData, applyScope: "SelectedApplications" })}
              className="mt-1"
            />
            <div>
              <div className="font-medium text-md-on-surface">Selected Applications</div>
              <div className="text-xs text-md-on-surface-variant">
                Run only for specific applications you choose
              </div>
            </div>
          </label>
        </div>
      </div>

      {formData.applyScope === "ByApplicability" && (
        <div>
          <label className="block text-sm font-medium text-md-on-surface mb-2">
            Select Categories <span className="text-[#e41f13]">*</span>
          </label>
          <div className="space-y-2 max-h-64 overflow-y-auto border border-md-outline-variant rounded p-3">
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
                  <div className="text-sm font-medium text-md-on-surface">{category.name}</div>
                  {category.description && (
                    <div className="text-xs text-md-on-surface-variant">{category.description}</div>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {formData.applyScope === "SelectedApplications" && (
        <div>
          <label className="block text-sm font-medium text-md-on-surface mb-2">
            Select Applications <span className="text-[#e41f13]">*</span>
          </label>
          <div className="space-y-2 max-h-64 overflow-y-auto border border-md-outline-variant rounded p-3">
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
                  <div className="text-sm font-medium text-md-on-surface">{app.name}</div>
                  <div className="text-xs text-md-on-surface-variant">
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
  const [columnComparisonMode, setColumnComparisonMode] = useState<Map<string, boolean>>(new Map())

  function getAllAvailableColumns(): CustomSelectOption[] {
    const columns: CustomSelectOption[] = []
    
    const fromCols = tableColumns.get(queryBuilder.fromTable) || []
    fromCols.forEach(col => {
      columns.push({
        value: `${queryBuilder.fromAlias}.${col.columnName}`,
        label: `${queryBuilder.fromAlias}.${col.columnName}`,
        description: `${queryBuilder.fromTable} - ${col.dataType}`,
      })
    })
    
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
        <h4 className="text-lg font-bold text-md-on-surface mb-1">SQL Query Builder</h4>
        <p className="text-sm text-md-on-surface-variant">
          Build the SQL query that will test this control. The query must return both 
          <code className="bg-md-surface-container-high px-2 py-0.5 rounded mx-1">application_id</code> and 
          <code className="bg-md-surface-container-high px-2 py-0.5 rounded mx-1">compliance_percentage</code> columns.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setUseVisualBuilder(false)}
          className={`px-4 py-2 rounded font-medium transition-colors ${
            !useVisualBuilder
              ? "bg-md-primary text-md-on-primary"
              : "bg-md-surface-container text-md-on-surface-variant hover:bg-md-surface-container-high"
          }`}
        >
          Raw SQL
        </button>
        <button
          onClick={() => {
            setUseVisualBuilder(true)
            if (formData.sqlText) {
              // Keep existing SQL
            } else {
              updateQueryFromBuilder()
            }
          }}
          className={`px-4 py-2 rounded font-medium transition-colors ${
            useVisualBuilder
              ? "bg-md-primary text-md-on-primary"
              : "bg-md-surface-container text-md-on-surface-variant hover:bg-md-surface-container-high"
          }`}
        >
          Visual Builder
        </button>
      </div>

      {useVisualBuilder && (
        <div className="space-y-4 border border-md-outline-variant rounded p-4 bg-md-surface">
          {/* FROM */}
          <div>
            <label className="block text-sm font-bold text-md-on-surface mb-2">FROM Table</label>
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
                className="w-24 border border-md-outline-variant rounded px-3 py-2 text-sm text-md-on-surface"
              />
            </div>
          </div>

          {/* JOINs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-md-on-surface">JOIN Tables</label>
              <button
                onClick={addJoin}
                className="text-xs px-3 py-1 rounded bg-md-primary-container text-md-on-primary-container font-bold hover:bg-md-primary hover:text-md-on-primary transition-colors"
              >
                + Add Join
              </button>
            </div>
            {queryBuilder.joins.length === 0 ? (
              <div className="text-sm text-md-on-surface-variant italic">No joins added</div>
            ) : (
              <div className="space-y-3">
                {queryBuilder.joins.map(join => {
                  const allColumns = getAllAvailableColumns()
                  
                  return (
                    <div key={join.id} className="bg-md-surface-container p-3 rounded border border-md-outline-variant space-y-2">
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
                          className="w-20 border border-md-outline-variant rounded px-2 py-1 text-sm"
                        />
                        <button
                          onClick={() => removeJoin(join.id)}
                          className="text-[#e41f13] hover:text-[#991b1b] font-bold text-lg"
                        >
                          ×
                        </button>
                      </div>
                      <div className="flex gap-2 items-center pl-2">
                        <span className="text-xs text-md-on-surface-variant font-bold">ON</span>
                        <CustomSelect
                          value={join.onLeft}
                          onChange={value => updateJoin(join.id, { onLeft: value })}
                          options={allColumns}
                          placeholder="Left column"
                          searchable
                          className="flex-1"
                        />
                        <span className="text-sm text-md-on-surface-variant">=</span>
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
              <label className="text-sm font-bold text-md-on-surface">SELECT Columns</label>
              <button
                onClick={addSelect}
                className="text-xs px-3 py-1 rounded bg-md-primary-container text-md-on-primary-container font-bold hover:bg-md-primary hover:text-md-on-primary transition-colors"
              >
                + Add Column
              </button>
            </div>
            <div className="space-y-2">
              {queryBuilder.selectColumns.map(sel => {
                const allColumns = getAllAvailableColumns()
                
                return (
                  <div key={sel.id} className="flex gap-2 items-start bg-md-surface-container p-3 rounded border border-md-outline-variant">
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
                      className="w-40 border border-md-outline-variant rounded px-2 py-1 text-sm"
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
              <label className="text-sm font-bold text-md-on-surface">WHERE Conditions</label>
              <button
                onClick={addWhere}
                className="text-xs px-3 py-1 rounded bg-md-primary-container text-md-on-primary-container font-bold hover:bg-md-primary hover:text-md-on-primary transition-colors"
              >
                + Add Condition
              </button>
            </div>
            {queryBuilder.whereConditions.length === 0 ? (
              <div className="text-sm text-md-on-surface-variant italic">No conditions added</div>
            ) : (
              <div className="space-y-2">
                {queryBuilder.whereConditions.map((cond, i) => {
                  const allColumns = getAllAvailableColumns()
                  const isColumnMode = columnComparisonMode.get(cond.id) || false
                  
                  return (
                    <div key={cond.id} className="bg-md-surface-container p-3 rounded border border-md-outline-variant space-y-2">
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
                                  ? "bg-md-primary text-md-on-primary"
                                  : "bg-md-surface-container text-md-on-surface-variant hover:bg-md-surface-container-high"
                              }`}
                            >
                              Compare to Value
                            </button>
                            <button
                              onClick={() => toggleComparisonMode(cond.id, true)}
                              className={`text-xs px-3 py-1 rounded transition-colors ${
                                isColumnMode
                                  ? "bg-md-primary text-md-on-primary"
                                  : "bg-md-surface-container text-md-on-surface-variant hover:bg-md-surface-container-high"
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
                              className="w-full border border-md-outline-variant rounded px-3 py-2 text-sm"
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
              <label className="text-sm font-bold text-md-on-surface">GROUP BY Columns</label>
              <button
                onClick={addGroupBy}
                className="text-xs px-3 py-1 rounded bg-md-primary-container text-md-on-primary-container font-bold hover:bg-md-primary hover:text-md-on-primary transition-colors"
              >
                + Add Column
              </button>
            </div>
            {queryBuilder.groupByColumns.length === 0 ? (
              <div className="text-sm text-md-on-surface-variant italic">No group by columns (required if using aggregates)</div>
            ) : (
              <div className="space-y-2">
                {queryBuilder.groupByColumns.map((col, i) => {
                  const allColumns = getAllAvailableColumns()
                  
                  return (
                    <div key={i} className="flex gap-2 items-start bg-md-surface-container p-3 rounded border border-md-outline-variant">
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
            <p className="text-xs text-md-on-surface-variant mt-1">
              If using aggregate functions (COUNT, BOOL_AND, etc.), list all non-aggregated SELECT columns here
            </p>
          </div>

          <button
            onClick={updateQueryFromBuilder}
            className="w-full bg-md-primary text-md-on-primary px-4 py-2.5 rounded-lg font-bold hover:opacity-90 transition-colors"
          >
            Generate SQL from Builder
          </button>
        </div>
      )}

      {/* SQL Text Editor */}
      <div>
        <label className="block text-sm font-bold text-md-on-surface mb-2">
          SQL Query <span className="text-[#e41f13]">*</span>
        </label>
        <textarea
          value={formData.sqlText}
          onChange={e => setFormData({ ...formData, sqlText: e.target.value })}
          placeholder="SELECT a.id AS application_id, ... AS compliance_percentage FROM applications a ..."
          rows={10}
          className="w-full border border-md-outline-variant rounded px-3 py-2.5 text-sm font-mono text-md-on-surface focus:outline-none focus:ring-2 focus:ring-[#ffe600] focus:border-transparent"
        />
        <p className="text-xs text-md-on-surface-variant mt-1">
          Query must return columns named "application_id" and "compliance_percentage" (0-100)
        </p>
      </div>

      <button
        onClick={onPreview}
        disabled={loadingPreview || !formData.sqlText.trim()}
        className="w-full bg-md-primary-container text-md-on-primary-container px-4 py-2.5 rounded-lg font-bold hover:bg-md-primary hover:text-md-on-primary transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loadingPreview ? "Loading Preview..." : "Preview Query Results"}
      </button>
    </div>
  )
}

function Step4ResultTemplate({
  formData,
  setFormData,
}: {
  formData: any
  setFormData: (data: any) => void
}) {
  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-lg font-bold text-md-on-surface mb-1">Result Template</h4>
        <p className="text-sm text-md-on-surface-variant">
          Define the message template that will be shown in assessment evidence. 
          The template will be rendered with the compliance percentage and other application details.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-md-on-surface mb-2">
          Answer Template <span className="text-[#e41f13]">*</span>
        </label>
        <textarea
          value={formData.answerTemplate}
          onChange={e => setFormData({ ...formData, answerTemplate: e.target.value })}
          placeholder="e.g., Application {{application_name}} has {{non_compliant_rows}} out of {{total_rows}} servers failing {{control_code}} compliance ({{compliance_percentage}} overall)."
          rows={4}
          className="w-full border border-md-outline-variant rounded px-3 py-2.5 text-md-on-surface focus:outline-none focus:ring-2 focus:ring-[#ffe600] focus:border-transparent"
        />
        <p className="text-xs text-md-on-surface-variant mt-1">
          Available placeholders: {"{{compliance_percentage}}"}, {"{{total_rows}}"}, {"{{compliant_rows}}"}, {"{{partial_gap_rows}}"}, {"{{non_compliant_rows}}"}, {"{{application_name}}"}, {"{{host}}"}, {"{{control_code}}"}
        </p>
      </div>

      <div className="bg-[#f0f9ff] border border-[#bae6fd] rounded p-4">
        <div className="text-sm font-bold text-[#0c4a6e] mb-2">Template Preview</div>
        
        <div className="space-y-3">
          <div>
            <div className="text-xs font-bold text-[#00a758] mb-1">Compliant (≥80%):</div>
            <div className="text-sm text-[#0c4a6e] bg-md-surface-container rounded p-3">
              {formData.answerTemplate 
                ? formData.answerTemplate
                    .replace(/\{\{compliance_percentage\}\}/g, "95.0%")
                    .replace(/\{\{total_rows\}\}/g, "10")
                    .replace(/\{\{compliant_rows\}\}/g, "10")
                    .replace(/\{\{partial_gap_rows\}\}/g, "0")
                    .replace(/\{\{non_compliant_rows\}\}/g, "0")
                    .replace(/\{\{application_name\}\}/g, "Example App")
                    .replace(/\{\{host\}\}/g, "app.example.com")
                    .replace(/\{\{control_code\}\}/g, "CTRL-001")
                : <span className="italic text-[#94a3b8]">Template will appear here...</span>
              }
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-[#f59e0b] mb-1">Partial Gap (40-79%):</div>
            <div className="text-sm text-[#0c4a6e] bg-md-surface-container rounded p-3">
              {formData.answerTemplate 
                ? formData.answerTemplate
                    .replace(/\{\{compliance_percentage\}\}/g, "65.0%")
                    .replace(/\{\{total_rows\}\}/g, "10")
                    .replace(/\{\{compliant_rows\}\}/g, "6")
                    .replace(/\{\{partial_gap_rows\}\}/g, "2")
                    .replace(/\{\{non_compliant_rows\}\}/g, "2")
                    .replace(/\{\{application_name\}\}/g, "Example App")
                    .replace(/\{\{host\}\}/g, "app.example.com")
                    .replace(/\{\{control_code\}\}/g, "CTRL-001")
                : <span className="italic text-[#94a3b8]">Template will appear here...</span>
              }
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-[#e41f13] mb-1">Not Compliant (&lt;40%):</div>
            <div className="text-sm text-[#0c4a6e] bg-md-surface-container rounded p-3">
              {formData.answerTemplate 
                ? formData.answerTemplate
                    .replace(/\{\{compliance_percentage\}\}/g, "25.0%")
                    .replace(/\{\{total_rows\}\}/g, "10")
                    .replace(/\{\{compliant_rows\}\}/g, "2")
                    .replace(/\{\{partial_gap_rows\}\}/g, "1")
                    .replace(/\{\{non_compliant_rows\}\}/g, "7")
                    .replace(/\{\{application_name\}\}/g, "Example App")
                    .replace(/\{\{host\}\}/g, "app.example.com")
                    .replace(/\{\{control_code\}\}/g, "CTRL-001")
                : <span className="italic text-[#94a3b8]">Template will appear here...</span>
              }
            </div>
          </div>
        </div>

        <div className="text-xs text-[#0c4a6e] mt-3 pt-3 border-t border-[#bae6fd]">
          <strong>Status Mapping:</strong> Compliant (≥80%), Partial Gap (40-79%), Not Compliant (&lt;40%)
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
    <div className="rounded-lg border border-md-outline-variant bg-md-surface-container p-6 shadow-sm">
      <div className="text-sm font-medium text-md-on-surface-variant uppercase tracking-wide">
        {title}
      </div>
      <div className="mt-3 text-4xl font-bold text-md-on-surface">
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
          "relative bg-md-surface-container rounded-lg shadow-lg w-full",
          wide ? "max-w-5xl" : "max-w-xl",
          "max-h-[90vh] flex flex-col",
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-2xl font-bold text-md-on-surface-variant hover:text-md-on-surface transition-colors z-10"
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
        className="relative bg-md-surface-container rounded-lg shadow-lg w-full max-w-3xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-2xl font-bold text-md-on-surface-variant hover:text-md-on-surface transition-colors z-10"
          title="Close"
        >
          ×
        </button>

        {/* Header */}
        <div className="p-6 border-b border-md-outline-variant">
          <h3 className="text-2xl font-bold text-md-on-surface mb-4">{title}</h3>
          
          {/* Progress Bar */}
          <div className="flex items-center gap-2">
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map(step => (
              <div key={step} className="flex-1">
                <div className={`h-2 rounded ${
                  step <= currentStep ? "bg-md-primary-container" : "bg-md-outline-variant"
                }`} />
              </div>
            ))}
          </div>
          <div className="mt-2 text-sm text-md-on-surface-variant">
            Step {currentStep} of {totalSteps}
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 flex-1">
          {children}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-md-outline-variant flex justify-between">
          <button
            onClick={onPrev}
            disabled={currentStep === 1 || submitting}
            className="px-5 py-2.5 rounded border border-md-outline-variant text-md-on-surface hover:bg-md-surface-container-high transition-colors font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-5 py-2.5 rounded border border-md-outline-variant text-md-on-surface hover:bg-md-surface-container-high transition-colors font-medium disabled:opacity-60"
            >
              Cancel
            </button>

            {currentStep < totalSteps ? (
              <button
                onClick={onNext}
                disabled={!canProceed || submitting}
                className="px-5 py-2.5 rounded-lg bg-md-primary text-md-on-primary font-medium hover:opacity-90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Next
              </button>
            ) : (
              <button
                onClick={onSubmit}
                disabled={!canProceed || submitting}
                className="px-5 py-2.5 rounded bg-md-primary-container text-md-on-primary-container font-bold hover:bg-md-primary hover:text-md-on-primary transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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