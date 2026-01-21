"use client"

import { useEffect, useState } from "react"
import {
  fetchIntegrations,
  activateIntegration,
  deactivateIntegration,
  fetchNormalizedData,
  fetchRecentRuns,
  fetchOrCreateSchedule,
  saveSchedule,
} from "./integrations-actions"
import type { Integration, IntegrationRun } from "@/lib/integrations.types"
export const dynamic = "force-dynamic"

/* ───────────────────────────────────────────── */
/* Helper Functions                              */
/* ───────────────────────────────────────────── */

function getCredentialFields(integration: Integration): Array<{ 
  key: string
  label: string
  type: string
  placeholder: string 
}> {
  // Generate fields dynamically from credentialEnvRefs
  return Object.keys(integration.credentialEnvRefs).map(key => {
    // Determine field type based on key name
    const lowerKey = key.toLowerCase()
    let type = "text"
    
    if (lowerKey.includes("password") || 
        lowerKey.includes("secret") || 
        lowerKey.includes("key") && !lowerKey.includes("keyid") ||
        lowerKey.includes("token")) {
      type = "password"
    } else if (lowerKey.includes("email")) {
      type = "email"
    } else if (lowerKey.includes("url") || lowerKey.includes("endpoint")) {
      type = "url"
    }
    
    // Generate label from key (camelCase to Title Case)
    const label = key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim()
    
    return {
      key,
      label,
      type,
      placeholder: `Enter ${label.toLowerCase()}`
    }
  })
}

function formatDateTime(dateString: string | null): string {
  if (!dateString) return "Never"
  const date = new Date(dateString)
  return date.toLocaleString()
}

function getStatusColor(status: string): string {
  switch (status) {
    case "Success": return "text-[#00a758]"
    case "Failed": return "text-[#e41f13]"
    case "Partial": return "text-[#f59e0b]"
    case "Started": return "text-[#666666]"
    default: return "text-[#666666]"
  }
}

function convertVisualScheduleToCron(
  repetition: "does-not-repeat" | "daily" | "weekdays" | "weekly" | "monthly" | "yearly" | "custom",
  startTime: string,
  daysOfWeek: number[],
  dayOfMonth: number,
  repeatInterval: number,
  repeatUnit: "day" | "week" | "month" | "year"
): { scheduleType: "Manual" | "Interval" | "Cron"; intervalMinutes: number | null; cronExpression: string | null } {
  const [hour, minute] = startTime.split(':').map(Number)
  
  switch (repetition) {
    case "does-not-repeat":
      return { scheduleType: "Manual", intervalMinutes: null, cronExpression: null }
    
    case "daily":
      return { scheduleType: "Cron", intervalMinutes: null, cronExpression: `${minute} ${hour} * * *` }
    
    case "weekdays":
      return { scheduleType: "Cron", intervalMinutes: null, cronExpression: `${minute} ${hour} * * 1-5` }
    
    case "weekly":
      // Multiple days: "0 9 * * 2,4" for Tue,Thu
      const daysList = daysOfWeek.sort((a, b) => a - b).join(',')
      return { scheduleType: "Cron", intervalMinutes: null, cronExpression: `${minute} ${hour} * * ${daysList}` }
    
    case "monthly":
      return { scheduleType: "Cron", intervalMinutes: null, cronExpression: `${minute} ${hour} ${dayOfMonth} * *` }
    
    case "yearly":
      return { scheduleType: "Cron", intervalMinutes: null, cronExpression: `${minute} ${hour} ${dayOfMonth} 1 *` }
    
    case "custom":
      if (repeatUnit === "day" && repeatInterval === 1) {
        return { scheduleType: "Cron", intervalMinutes: null, cronExpression: `${minute} ${hour} * * *` }
      } else if (repeatUnit === "week" && repeatInterval === 1) {
        const daysList = daysOfWeek.sort((a, b) => a - b).join(',')
        return { scheduleType: "Cron", intervalMinutes: null, cronExpression: `${minute} ${hour} * * ${daysList}` }
      } else if (repeatUnit === "month" && repeatInterval === 1) {
        return { scheduleType: "Cron", intervalMinutes: null, cronExpression: `${minute} ${hour} ${dayOfMonth} * *` }
      } else if (repeatUnit === "year" && repeatInterval === 1) {
        return { scheduleType: "Cron", intervalMinutes: null, cronExpression: `${minute} ${hour} ${dayOfMonth} 1 *` }
      } else {
        const minutes = repeatInterval * (
          repeatUnit === "day" ? 1440 :
          repeatUnit === "week" ? 10080 :
          repeatUnit === "month" ? 43200 :
          525600
        )
        return { scheduleType: "Interval", intervalMinutes: minutes, cronExpression: null }
      }
    
    default:
      return { scheduleType: "Manual", intervalMinutes: null, cronExpression: null }
  }
}

function generateScheduleSummary(
  repetition: "does-not-repeat" | "daily" | "weekdays" | "weekly" | "monthly" | "yearly" | "custom",
  startDate: string,
  startTime: string,
  daysOfWeek: number[],
  dayOfMonth: number,
  repeatInterval: number,
  repeatUnit: "day" | "week" | "month" | "year",
  endDate: string | null
): string {
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const formattedDate = new Date(startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
  const endDateFormatted = endDate ? new Date(endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : null
  
  const endStr = endDateFormatted ? ` until ${endDateFormatted}` : ''
  
  // Helper to format multiple days
  const formatDays = (days: number[]) => {
    if (days.length === 0) return ""
    if (days.length === 1) return DAYS[days[0]]
    if (days.length === 7) return "every day"
    
    const sorted = [...days].sort((a, b) => a - b)
    
    // Check if it's weekdays (1-5)
    if (sorted.length === 5 && sorted.join(',') === '1,2,3,4,5') {
      return "weekdays (Mon - Fri)"
    }
    
    // Check if it's weekends (0,6)
    if (sorted.length === 2 && sorted.join(',') === '0,6') {
      return "weekends (Sat - Sun)"
    }
    
    // Otherwise list them
    if (sorted.length === 2) {
      return `${DAYS_SHORT[sorted[0]]} and ${DAYS_SHORT[sorted[1]]}`
    }
    
    return sorted.map((d, i) => {
      if (i === sorted.length - 1) return `and ${DAYS_SHORT[d]}`
      return DAYS_SHORT[d]
    }).join(', ')
  }
  
  switch (repetition) {
    case "does-not-repeat":
      return `Run once on ${formattedDate} at ${startTime}`
    
    case "daily":
      return `Occurs every day at ${startTime} starting ${formattedDate}${endStr}`
    
    case "weekdays":
      return `Occurs every weekday (Mon - Fri) at ${startTime} starting ${formattedDate}${endStr}`
    
    case "weekly":
      const daysText = formatDays(daysOfWeek)
      return `Occurs every ${daysText} at ${startTime} starting ${formattedDate}${endStr}`
    
    case "monthly":
      const suffix = dayOfMonth === 1 ? 'st' : dayOfMonth === 2 ? 'nd' : dayOfMonth === 3 ? 'rd' : 'th'
      return `Occurs on the ${dayOfMonth}${suffix} of every month at ${startTime} starting ${formattedDate}${endStr}`
    
    case "yearly":
      return `Occurs every year on ${formattedDate} at ${startTime}${endStr}`
    
    case "custom":
      const interval = repeatInterval > 1 ? `${repeatInterval} ` : ''
      const unitPlural = repeatInterval > 1 ? `${repeatUnit}s` : repeatUnit
      if (repeatUnit === "week") {
        const daysText = formatDays(daysOfWeek)
        return `Occurs every ${interval}${unitPlural} on ${daysText} at ${startTime} starting ${formattedDate}${endStr}`
      } else if (repeatUnit === "month") {
        const suffix = dayOfMonth === 1 ? 'st' : dayOfMonth === 2 ? 'nd' : dayOfMonth === 3 ? 'rd' : 'th'
        return `Occurs every ${interval}${unitPlural} on the ${dayOfMonth}${suffix} at ${startTime} starting ${formattedDate}${endStr}`
      } else {
        return `Occurs every ${interval}${unitPlural} at ${startTime} starting ${formattedDate}${endStr}`
      }
    
    default:
      return ""
  }
}

const DAYS_OF_WEEK = [
  { value: 0, label: "S" },
  { value: 1, label: "M" },
  { value: 2, label: "T" },
  { value: 3, label: "W" },
  { value: 4, label: "T" },
  { value: 5, label: "F" },
  { value: 6, label: "S" },
]

/* ───────────────────────────────────────────── */
/* Main Component                                */
/* ───────────────────────────────────────────── */

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [showMarketplace, setShowMarketplace] = useState(false)
  const [search, setSearch] = useState("")
  const [configuring, setConfiguring] = useState<Integration | null>(null)
  const [configFormData, setConfigFormData] = useState<{ [key: string]: string }>({})
  const [submitting, setSubmitting] = useState(false)

  // Expanded cards state
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [cardRuns, setCardRuns] = useState<Map<string, IntegrationRun[]>>(new Map())
  const [loadingRuns, setLoadingRuns] = useState<Set<string>>(new Set())

  // Results modal state
  const [loadingResults, setLoadingResults] = useState(false)
  const [resultsData, setResultsData] = useState<Record<string, any>[] | null>(null)
  const [resultsIntegration, setResultsIntegration] = useState<Integration | null>(null)

  // Column selection modal state (for first run)
  const [showColumnSelection, setShowColumnSelection] = useState(false)
  const [availableColumns, setAvailableColumns] = useState<string[]>([])
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set())
  const [columnSelectionIntegration, setColumnSelectionIntegration] = useState<Integration | null>(null)

  // Scheduling modal state
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [schedulingIntegration, setSchedulingIntegration] = useState<Integration | null>(null)
  const [scheduleData, setScheduleData] = useState<{
    id: string | null
    scheduleType: "Manual" | "Interval" | "Cron"
    intervalMinutes: number | null
    cronExpression: string | null
    enabled: boolean
    repetition: "does-not-repeat" | "daily" | "weekdays" | "weekly" | "monthly" | "yearly" | "custom"
    startDate: string
    startTime: string
    daysOfWeek: number[] // Multiple days for weekly schedules
    dayOfMonth: number
    repeatInterval: number
    repeatUnit: "day" | "week" | "month" | "year"
    endDate: string | null
  }>({
    id: null,
    scheduleType: "Manual",
    intervalMinutes: null,
    cronExpression: null,
    enabled: false,
    repetition: "does-not-repeat",
    startDate: new Date().toISOString().split('T')[0],
    startTime: "09:00",
    daysOfWeek: [1], // Default to Monday
    dayOfMonth: 1,
    repeatInterval: 1,
    repeatUnit: "week",
    endDate: null,
  })

  // Marketplace category collapse state
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())

  function toggleCategory(category: string) {
    const newCollapsed = new Set(collapsedCategories)
    if (collapsedCategories.has(category)) {
      newCollapsed.delete(category)
    } else {
      newCollapsed.add(category)
    }
    setCollapsedCategories(newCollapsed)
  }

  useEffect(() => {
    loadIntegrations()
  }, [])

  async function loadIntegrations() {
    try {
      setLoading(true)
      const data = await fetchIntegrations()
      setIntegrations(data)
    } catch (error) {
      console.error("Failed to load integrations:", error)
      alert("Failed to load integrations")
    } finally {
      setLoading(false)
    }
  }

  async function toggleCard(integrationId: string) {
    const newExpanded = new Set(expandedCards)
    
    if (expandedCards.has(integrationId)) {
      newExpanded.delete(integrationId)
      setExpandedCards(newExpanded)
    } else {
      newExpanded.add(integrationId)
      setExpandedCards(newExpanded)
      
      // Load runs if not already loaded
      if (!cardRuns.has(integrationId)) {
        await loadRunsForCard(integrationId)
      }
    }
  }

  async function loadRunsForCard(integrationId: string) {
    try {
      setLoadingRuns(prev => new Set(prev).add(integrationId))
      const runs = await fetchRecentRuns(integrationId, 10)
      setCardRuns(prev => new Map(prev).set(integrationId, runs))
    } catch (error) {
      console.error("Failed to load runs:", error)
    } finally {
      setLoadingRuns(prev => {
        const newSet = new Set(prev)
        newSet.delete(integrationId)
        return newSet
      })
    }
  }

  // Filter integrations
  const activeIntegrations = integrations.filter(i => i.status === "Active")
  const marketplaceIntegrations = integrations
    .filter(i => i.status === "Disabled")
    .filter(i =>
      i.displayName.toLowerCase().includes(search.toLowerCase()) ||
      i.type.toLowerCase().includes(search.toLowerCase())
    )

  // Group marketplace by category
  const marketplaceByCategory = marketplaceIntegrations.reduce((acc, integration) => {
    if (!acc[integration.type]) {
      acc[integration.type] = []
    }
    acc[integration.type].push(integration)
    return acc
  }, {} as Record<string, Integration[]>)

  const categories = Object.keys(marketplaceByCategory).sort()

  // KPIs
  const uniqueTypes = new Set(activeIntegrations.map(i => i.type)).size
  const activeCount = activeIntegrations.length

  async function handleActivateIntegration(integration: Integration) {
    try {
      setSubmitting(true)
      await activateIntegration(integration.id)
      await loadIntegrations()
      setShowMarketplace(false)
    } catch (error) {
      console.error("Failed to activate integration:", error)
      alert("Failed to activate integration")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeactivateIntegration(integration: Integration) {
    if (!confirm(`Are you sure you want to deactivate ${integration.displayName}?`)) {
      return
    }

    try {
      setSubmitting(true)
      await deactivateIntegration(integration.id)
      await loadIntegrations()
    } catch (error) {
      console.error("Failed to deactivate integration:", error)
      alert("Failed to deactivate integration")
    } finally {
      setSubmitting(false)
    }
  }

  async function configureIntegration() {
    if (!configuring) return

    try {
      setSubmitting(true)
      
      // TODO: Call backend API to store credentials in environment
      console.log("Storing credentials for", configuring.id, configFormData)
      
      alert("Configuration saved successfully (placeholder)")
      setConfiguring(null)
      setConfigFormData({})
    } catch (error) {
      console.error("Failed to configure integration:", error)
      alert("Failed to save configuration")
    } finally {
      setSubmitting(false)
    }
  }

  async function executeAssessment(integration: Integration) {
    try {
      setSubmitting(true)

      console.log("Executing assessment for", integration.id)
      
      // If first run (schema not initialized), show column selection
      if (!integration.schemaInitialized) {
        const mockColumns = ["host", "endpoint_ip", "grade", "max_tls_version", "supports_tls_1_3", "status", "scanned_at"]
        setAvailableColumns(mockColumns)
        setSelectedColumns(new Set(mockColumns))
        setColumnSelectionIntegration(integration)
        setShowColumnSelection(true)
      } else {
        alert("Assessment executed successfully (placeholder)")
        await loadIntegrations()
        if (expandedCards.has(integration.id)) {
          await loadRunsForCard(integration.id)
        }
      }
    } catch (error) {
      console.error("Failed to execute assessment:", error)
      alert("Failed to execute assessment")
    } finally {
      setSubmitting(false)
    }
  }

  async function submitColumnSelection() {
    if (!columnSelectionIntegration) return

    try {
      setSubmitting(true)
      console.log("Selected columns:", Array.from(selectedColumns))
      
      alert("Schema initialized successfully (placeholder)")
      setShowColumnSelection(false)
      setColumnSelectionIntegration(null)
      await loadIntegrations()
    } catch (error) {
      console.error("Failed to initialize schema:", error)
      alert("Failed to initialize schema")
    } finally {
      setSubmitting(false)
    }
  }

  async function loadResults(integration: Integration) {
    if (!integration.normalizedTableName) {
      alert("No normalized table configured for this integration")
      return
    }

    try {
      setLoadingResults(true)
      setResultsIntegration(integration)
      
      const data = await fetchNormalizedData(integration.normalizedTableName, 1000)
      setResultsData(data)
    } catch (error) {
      console.error("Failed to load results:", error)
      alert("Failed to load results")
      setResultsIntegration(null)
    } finally {
      setLoadingResults(false)
    }
  }

  async function openScheduleModal(integration: Integration) {
    try {
      setSubmitting(true)
      const schedule = await fetchOrCreateSchedule(integration.id)
      setScheduleData({
        id: schedule.id,
        scheduleType: schedule.scheduleType,
        intervalMinutes: schedule.intervalMinutes,
        cronExpression: schedule.cronExpression,
        enabled: schedule.enabled,
        repetition: "does-not-repeat",
        startDate: new Date().toISOString().split('T')[0],
        startTime: "09:00",
        daysOfWeek: [1], // Default to Monday
        dayOfMonth: 1,
        repeatInterval: 1,
        repeatUnit: "week",
        endDate: null,
      })
      setSchedulingIntegration(integration)
      setShowScheduleModal(true)
    } catch (error) {
      console.error("Failed to load schedule:", error)
      alert("Failed to load schedule")
    } finally {
      setSubmitting(false)
    }
  }

  async function saveScheduleConfig() {
    if (!scheduleData.id) return

    try {
      setSubmitting(true)
      
      const converted = convertVisualScheduleToCron(
        scheduleData.repetition,
        scheduleData.startTime,
        scheduleData.daysOfWeek,
        scheduleData.dayOfMonth,
        scheduleData.repeatInterval,
        scheduleData.repeatUnit
      )
      
      await saveSchedule(scheduleData.id, {
        scheduleType: converted.scheduleType,
        intervalMinutes: converted.intervalMinutes,
        cronExpression: converted.cronExpression,
        enabled: scheduleData.enabled,
      })
      
      alert("Schedule saved successfully")
      setShowScheduleModal(false)
      setSchedulingIntegration(null)
      await loadIntegrations()
    } catch (error) {
      console.error("Failed to save schedule:", error)
      alert("Failed to save schedule")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-[#666666]">Loading integrations...</div>
      </div>
    )
  }

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#333333]">
            Security Tools Integration
          </h1>
          <p className="mt-1 text-base text-[#666666] max-w-4xl">
            Following section provides an overview of cybersecurity tools integrated with 
            the AutoGRC platform. These integrations enable automated compliance monitoring, 
            vulnerability assessments, and continuous security posture management across your 
            organization's infrastructure.
          </p>
        </div>

        <button
          onClick={() => setShowMarketplace(true)}
          className="bg-[#ffe600] text-[#333333] px-6 py-2.5 rounded font-bold transition-colors hover:bg-[#333333] hover:text-white"
        >
          Add Integration
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <KpiCard 
          title="Security Domains" 
          value={uniqueTypes} 
        />
        <KpiCard 
          title="Active Integrations" 
          value={activeCount} 
        />
      </div>

      {/* Connected tools */}
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-[#333333]">
            Active security tool integrations
          </h2>
          <p className="mt-1 text-base text-[#666666] max-w-4xl">
            Following section lists all cybersecurity tools currently integrated with the 
            platform. Configure API endpoints, execute automated assessments, and manage 
            integration lifecycles for each connected tool.
          </p>
        </div>

        {activeIntegrations.length === 0 ? (
          <div className="rounded-lg border border-[#cccccc] bg-white p-12 text-center shadow-sm">
            <div className="text-[#666666] mb-4">
              No security tools integrated yet. Browse the marketplace to add integrations.
            </div>
            <button
              onClick={() => setShowMarketplace(true)}
              className="bg-[#ffe600] text-[#333333] px-6 py-2.5 rounded font-bold transition-colors hover:bg-[#333333] hover:text-white"
            >
              Browse Marketplace
            </button>
          </div>
        ) : (
          activeIntegrations.map(tool => {
            const isExpanded = expandedCards.has(tool.id)
            const runs = cardRuns.get(tool.id) || []
            const isLoadingRuns = loadingRuns.has(tool.id)

            return (
              <div key={tool.id} className="rounded-lg border border-[#cccccc] bg-white shadow-sm">
                {/* Collapsed Header */}
                <div 
                  className="p-6 cursor-pointer hover:bg-[#f9f9f9] transition-colors"
                  onClick={() => toggleCard(tool.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="font-bold text-lg text-[#333333]">{tool.displayName}</div>
                        <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                          tool.status === "Active" 
                            ? "bg-[#00a758] text-white" 
                            : tool.status === "Error"
                            ? "bg-[#e41f13] text-white"
                            : "bg-[#cccccc] text-[#666666]"
                        }`}>
                          {tool.status.toUpperCase()}
                        </span>
                        {tool.schemaInitialized && (
                          <span className="text-xs px-2 py-0.5 rounded bg-[#ffe600] text-[#333333] font-bold">
                            CONFIGURED
                          </span>
                        )}
                        {tool.scheduleEnabled && (
                          <span className="text-xs px-2 py-0.5 rounded bg-[#2e2e38] text-white font-bold">
                            SCHEDULED
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-[#666666] mt-1">
                        {tool.type} • {tool.authType} • {tool.successfulRuns} successful runs
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
                    <div className="space-y-2">
                      <div className="text-sm text-[#666666]">
                        <span className="font-bold">API Endpoint:</span> {tool.apiBaseUrl}
                      </div>
                      {tool.lastSyncAt && (
                        <div className="text-sm text-[#666666]">
                          <span className="font-bold">Last Synced:</span> {formatDateTime(tool.lastSyncAt)}
                        </div>
                      )}
                      {tool.lastError && (
                        <div className="text-sm text-[#e41f13]">
                          <span className="font-bold">Last Error:</span> {tool.lastError}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 flex-wrap">
                      <button
                        onClick={() => {
                          setConfiguring(tool)
                          setConfigFormData({})
                        }}
                        disabled={submitting}
                        className="text-xs px-4 py-2 rounded border border-[#cccccc] text-[#333333] hover:bg-white transition-colors font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        Configure API
                      </button>

                      <button
                        onClick={() => executeAssessment(tool)}
                        disabled={submitting}
                        className="text-xs px-4 py-2 rounded bg-[#333333] text-white font-medium hover:bg-[#555555] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {submitting ? "Executing..." : "Execute Assessment"}
                      </button>

                      <button
                        onClick={() => openScheduleModal(tool)}
                        disabled={submitting}
                        className="text-xs px-4 py-2 rounded border border-[#2e2e38] text-[#2e2e38] hover:bg-[#2e2e38] hover:text-white transition-colors font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        Schedule Runs
                      </button>

                      {tool.normalizedTableName ? (
                        <button
                          onClick={() => loadResults(tool)}
                          disabled={loadingResults}
                          className="text-xs px-4 py-2 rounded border border-[#cccccc] text-[#333333] hover:bg-white transition-colors font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {loadingResults ? "Loading..." : "Load Results"}
                        </button>
                      ) : (
                        <button
                          disabled
                          className="text-xs px-4 py-2 rounded border border-[#cccccc] text-[#999999] bg-[#f9f9f9] cursor-not-allowed font-medium"
                          title="Execute assessment first to initialize schema"
                        >
                          Load Results (Not Configured)
                        </button>
                      )}

                      <button
                        onClick={() => handleDeactivateIntegration(tool)}
                        disabled={submitting}
                        className="text-xs px-4 py-2 rounded border border-[#e41f13] text-[#e41f13] hover:bg-[#e41f13] hover:text-white transition-colors font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        Deactivate
                      </button>
                    </div>

                    {/* Run History */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-[#333333]">Recent Runs</h3>
                        <button
                          onClick={() => loadRunsForCard(tool.id)}
                          disabled={isLoadingRuns}
                          className="text-xs px-3 py-1 rounded border border-[#cccccc] text-[#666666] hover:bg-white transition-colors disabled:opacity-60"
                        >
                          {isLoadingRuns ? "Loading..." : "Refresh"}
                        </button>
                      </div>

                      {isLoadingRuns ? (
                        <div className="text-sm text-[#666666] py-4">Loading runs...</div>
                      ) : runs.length === 0 ? (
                        <div className="text-sm text-[#666666] py-4">No runs yet. Execute an assessment to see results here.</div>
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
                                      {run.triggerType}
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
                                <div className="text-right text-xs text-[#666666]">
                                  {run.recordsProcessed !== null && (
                                    <div>Processed: {run.recordsProcessed}</div>
                                  )}
                                  {run.recordsFailed !== null && run.recordsFailed > 0 && (
                                    <div className="text-[#e41f13]">Failed: {run.recordsFailed}</div>
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

      {/* Marketplace Modal */}
      {showMarketplace && (
        <Modal onClose={() => setShowMarketplace(false)} wide>
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-[#333333]">
              Security Tools Marketplace
            </h3>
            <p className="mt-1 text-base text-[#666666]">
              Browse and activate integrations with leading cybersecurity platforms across 
              vulnerability management, cloud security, identity management, and threat intelligence.
            </p>
          </div>

          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by tool name or category..."
            className="w-full border border-[#cccccc] rounded px-4 py-2.5 text-[#333333] placeholder:text-[#999999]"
          />

          {marketplaceIntegrations.length === 0 ? (
            <div className="mt-8 text-center text-[#666666] py-12">
              {search ? "No tools found matching your search criteria." : "All available integrations are already active."}
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {categories.map(category => {
                const isCollapsed = collapsedCategories.has(category)
                const toolsInCategory = marketplaceByCategory[category]

                return (
                  <div key={category} className="border border-[#cccccc] rounded-lg overflow-hidden">
                    {/* Category Header */}
                    <button
                      onClick={() => toggleCategory(category)}
                      className="w-full flex items-center justify-between p-4 bg-[#f9f9f9] hover:bg-[#f0f0f0] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-[#333333]">{category}</span>
                        <span className="text-xs px-2 py-1 rounded bg-[#ffe600] text-[#333333] font-bold">
                          {toolsInCategory.length} {toolsInCategory.length === 1 ? 'tool' : 'tools'}
                        </span>
                      </div>
                      <span className="text-[#666666]">
                        {isCollapsed ? "▶" : "▼"}
                      </span>
                    </button>

                    {/* Category Content */}
                    {!isCollapsed && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white">
                        {toolsInCategory.map(tool => (
                          <div key={tool.id} className="rounded-lg border border-[#e5e7eb] bg-white p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-2">
                              <div className="font-bold text-[#333333]">{tool.displayName}</div>
                            </div>
                            <div className="text-xs text-[#999999] mb-2">{tool.authType}</div>
                            <div className="text-sm text-[#666666] mb-4 line-clamp-2">
                              {tool.apiBaseUrl}
                            </div>

                            <button
                              onClick={() => handleActivateIntegration(tool)}
                              disabled={submitting}
                              className="w-full bg-[#ffe600] text-[#333333] px-4 py-2 rounded font-bold transition-colors hover:bg-[#333333] hover:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              {submitting ? "Activating..." : "Activate Integration"}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </Modal>
      )}

      {/* Configure Modal */}
      {configuring && (
        <Modal onClose={() => setConfiguring(null)}>
          <div className="mb-6">
            <h3 className="text-xl font-bold text-[#333333]">
              Configure API Credentials
            </h3>
            <p className="mt-1 text-sm text-[#666666]">
              Configure the API credentials for {configuring.displayName} integration
            </p>
          </div>

          <div className="space-y-4">
            {getCredentialFields(configuring).map(field => (
              <div key={field.key}>
                <label className="block text-sm font-bold text-[#333333] mb-2">
                  {field.label}
                </label>
                <input
                  type={field.type}
                  value={configFormData[field.key] ?? ""}
                  onChange={e => setConfigFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="w-full border border-[#cccccc] rounded px-3 py-2 text-[#333333]"
                />
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button 
              onClick={() => setConfiguring(null)} 
              disabled={submitting}
              className="text-xs px-4 py-2 rounded border border-[#cccccc] text-[#333333] hover:bg-[#f9f9f9] transition-colors font-medium disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={configureIntegration}
              disabled={submitting}
              className="text-xs px-4 py-2 rounded bg-[#333333] text-white font-medium hover:bg-[#555555] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? "Saving..." : "Save Configuration"}
            </button>
          </div>
        </Modal>
      )}

      {/* Schedule Modal - MS Teams Style */}
      {showScheduleModal && schedulingIntegration && (
        <Modal onClose={() => setShowScheduleModal(false)}>
          <div className="mb-6">
            <h3 className="text-xl font-bold text-[#333333]">
              Set Recurrence
            </h3>
            <p className="mt-1 text-sm text-[#666666]">
              Configure automated assessment scheduling for {schedulingIntegration.displayName}
            </p>
          </div>

          <div className="space-y-5">
            {/* Repeats Dropdown */}
            <div>
              <label className="block text-sm font-medium text-[#666666] mb-2">
                Repeats
              </label>
              <select
                value={scheduleData.repetition}
                onChange={e => setScheduleData(prev => ({ 
                  ...prev, 
                  repetition: e.target.value as any
                }))}
                className="w-full border border-[#cccccc] rounded px-3 py-2.5 text-[#333333] bg-white focus:outline-none focus:ring-2 focus:ring-[#ffe600] focus:border-transparent"
              >
                <option value="does-not-repeat">Does not repeat</option>
                <option value="daily">Daily</option>
                <option value="weekdays">Every weekday (Mon - Fri)</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-[#666666] mb-2">
                Start
              </label>
              <input
                type="date"
                value={scheduleData.startDate}
                onChange={e => setScheduleData(prev => ({ 
                  ...prev, 
                  startDate: e.target.value
                }))}
                className="w-full border border-[#cccccc] rounded px-3 py-2.5 text-[#333333] focus:outline-none focus:ring-2 focus:ring-[#ffe600] focus:border-transparent"
              />
            </div>

            {/* Custom Repeat Every */}
            {scheduleData.repetition === "custom" && (
              <div>
                <label className="block text-sm font-medium text-[#666666] mb-2">
                  Repeat every
                </label>
                <div className="flex gap-3">
                  <input
                    type="number"
                    min="1"
                    value={scheduleData.repeatInterval}
                    onChange={e => setScheduleData(prev => ({ 
                      ...prev, 
                      repeatInterval: parseInt(e.target.value) || 1
                    }))}
                    className="w-20 border border-[#cccccc] rounded px-3 py-2.5 text-[#333333] text-center focus:outline-none focus:ring-2 focus:ring-[#ffe600] focus:border-transparent"
                  />
                  <select
                    value={scheduleData.repeatUnit}
                    onChange={e => setScheduleData(prev => ({ 
                      ...prev, 
                      repeatUnit: e.target.value as any
                    }))}
                    className="flex-1 border border-[#cccccc] rounded px-3 py-2.5 text-[#333333] bg-white focus:outline-none focus:ring-2 focus:ring-[#ffe600] focus:border-transparent"
                  >
                    <option value="day">Day</option>
                    <option value="week">Week</option>
                    <option value="month">Month</option>
                    <option value="year">Year</option>
                  </select>
                </div>
              </div>
            )}

            {/* Day of Week Selector (circular buttons) */}
            {(scheduleData.repetition === "weekly" || (scheduleData.repetition === "custom" && scheduleData.repeatUnit === "week")) && (
              <div>
                <label className="block text-sm font-medium text-[#666666] mb-3">
                  Repeat on
                </label>
                <div className="flex gap-2 justify-center">
                  {DAYS_OF_WEEK.map(day => {
                    const isSelected = scheduleData.daysOfWeek.includes(day.value)
                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => {
                          setScheduleData(prev => {
                            const currentDays = prev.daysOfWeek
                            let newDays: number[]
                            
                            if (isSelected) {
                              // Remove day (but keep at least one day selected)
                              newDays = currentDays.filter(d => d !== day.value)
                              if (newDays.length === 0) {
                                newDays = [day.value] // Keep at least one day
                              }
                            } else {
                              // Add day
                              newDays = [...currentDays, day.value]
                            }
                            
                            return { ...prev, daysOfWeek: newDays }
                          })
                        }}
                        className={`w-10 h-10 rounded-full font-medium transition-all ${
                          isSelected
                            ? "bg-[#ffe600] text-[#333333] font-bold"
                            : "bg-[#f5f5f5] text-[#666666] hover:bg-[#e5e7eb]"
                        }`}
                      >
                        {day.label}
                      </button>
                    )
                  })}
                </div>
                <div className="text-xs text-[#999999] mt-2 text-center">
                  Click to select multiple days
                </div>
              </div>
            )}

            {/* Start Time */}
            {scheduleData.repetition !== "does-not-repeat" && (
              <div>
                <label className="block text-sm font-medium text-[#666666] mb-2">
                  Time
                </label>
                <input
                  type="time"
                  value={scheduleData.startTime}
                  onChange={e => setScheduleData(prev => ({ 
                    ...prev, 
                    startTime: e.target.value
                  }))}
                  className="w-full border border-[#cccccc] rounded px-3 py-2.5 text-[#333333] focus:outline-none focus:ring-2 focus:ring-[#ffe600] focus:border-transparent"
                />
              </div>
            )}

            {/* End Date */}
            {scheduleData.repetition !== "does-not-repeat" && (
              <div>
                <label className="block text-sm font-medium text-[#666666] mb-2">
                  End
                </label>
                <input
                  type="date"
                  value={scheduleData.endDate ?? ""}
                  onChange={e => setScheduleData(prev => ({ 
                    ...prev, 
                    endDate: e.target.value || null
                  }))}
                  min={scheduleData.startDate}
                  placeholder="Select date"
                  className="w-full border border-[#cccccc] rounded px-3 py-2.5 text-[#333333] focus:outline-none focus:ring-2 focus:ring-[#ffe600] focus:border-transparent"
                />
              </div>
            )}

            {/* Schedule Summary */}
            <div className="bg-[#f5f5f5] rounded p-3 border border-[#e5e7eb]">
              <div className="text-xs text-[#666666]">
                {generateScheduleSummary(
                  scheduleData.repetition,
                  scheduleData.startDate,
                  scheduleData.startTime,
                  scheduleData.daysOfWeek,
                  scheduleData.dayOfMonth,
                  scheduleData.repeatInterval,
                  scheduleData.repeatUnit,
                  scheduleData.endDate
                )}
              </div>
            </div>

            {/* Enabled Toggle */}
            <div className="flex items-center gap-3 p-4 bg-[#fffef0] rounded border-2 border-[#ffe600]">
              <input
                type="checkbox"
                id="schedule-enabled"
                checked={scheduleData.enabled}
                onChange={e => setScheduleData(prev => ({ 
                  ...prev, 
                  enabled: e.target.checked
                }))}
                className="w-4 h-4 accent-[#ffe600]"
              />
              <label htmlFor="schedule-enabled" className="text-sm font-medium text-[#333333]">
                Enable Automated Scheduling
              </label>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button 
              onClick={() => setShowScheduleModal(false)} 
              disabled={submitting}
              className="px-5 py-2.5 rounded border border-[#cccccc] text-[#333333] hover:bg-[#f5f5f5] transition-colors font-medium disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={saveScheduleConfig}
              disabled={submitting}
              className="px-5 py-2.5 rounded bg-[#333333] text-white font-medium hover:bg-[#555555] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? "Saving..." : "Save"}
            </button>
          </div>
        </Modal>
      )}

      {/* Column Selection Modal (First Run) */}
      {showColumnSelection && columnSelectionIntegration && (
        <Modal onClose={() => setShowColumnSelection(false)} wide>
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-[#333333]">
              Select Data Columns to Store
            </h3>
            <p className="mt-1 text-base text-[#666666]">
              Choose which columns from the {columnSelectionIntegration.displayName} assessment 
              results should be stored in the normalized table for future analysis.
            </p>
          </div>

          <div className="space-y-3">
            {availableColumns.map(col => (
              <label key={col} className="flex items-center gap-3 p-3 border border-[#cccccc] rounded hover:bg-[#f9f9f9] cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedColumns.has(col)}
                  onChange={e => {
                    const newSelected = new Set(selectedColumns)
                    if (e.target.checked) {
                      newSelected.add(col)
                    } else {
                      newSelected.delete(col)
                    }
                    setSelectedColumns(newSelected)
                  }}
                  className="w-4 h-4"
                />
                <span className="font-medium text-[#333333]">{col}</span>
              </label>
            ))}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button 
              onClick={() => setShowColumnSelection(false)} 
              disabled={submitting}
              className="text-xs px-4 py-2 rounded border border-[#cccccc] text-[#333333] hover:bg-[#f9f9f9] transition-colors font-medium disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={submitColumnSelection}
              disabled={submitting || selectedColumns.size === 0}
              className="text-xs px-4 py-2 rounded bg-[#333333] text-white font-medium hover:bg-[#555555] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? "Initializing..." : `Initialize Schema (${selectedColumns.size} columns)`}
            </button>
          </div>
        </Modal>
      )}

      {/* Results Modal */}
      {resultsIntegration && resultsData && (
        <Modal onClose={() => { setResultsIntegration(null); setResultsData(null) }} wide>
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-[#333333]">
              {resultsIntegration.displayName} - Assessment Results
            </h3>
            <p className="mt-1 text-base text-[#666666]">
              Showing {resultsData.length} records from {resultsIntegration.normalizedTableName}
            </p>
          </div>

          <div className="overflow-x-auto">
            {resultsData.length === 0 ? (
              <div className="text-center py-12 text-[#666666]">
                No results available yet. Execute an assessment to populate data.
              </div>
            ) : (
              <table className="min-w-full border border-[#cccccc] text-sm">
                <thead className="bg-[#f9f9f9]">
                  <tr>
                    {Object.keys(resultsData[0]).map(key => (
                      <th key={key} className="border border-[#cccccc] px-4 py-3 text-left font-bold text-[#333333]">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {resultsData.map((row, i) => (
                    <tr key={i} className="odd:bg-white even:bg-[#fafafa] hover:bg-[#f5f5f5]">
                      {Object.values(row).map((val, j) => (
                        <td key={j} className="border border-[#e5e7eb] px-4 py-3 text-[#666666]">
                          {val === null || val === undefined 
                            ? "—" 
                            : typeof val === "boolean"
                            ? val ? "Yes" : "No"
                            : typeof val === "object"
                            ? JSON.stringify(val)
                            : String(val)
                          }
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Modal>
      )}
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