/* ───────────────────────────────────────────── */
/* Integration Types                             */
/* ───────────────────────────────────────────── */

export type Integration = {
  id: string
  type: string
  displayName: string
  apiBaseUrl: string
  authType: string
  credentialEnvRefs: Record<string, string>
  normalizedTableName: string | null
  schemaInitialized: boolean
  status: "Active" | "Disabled" | "Error"
  lastSyncAt: string | null
  lastError: string | null
  createdAt: string
  // Joined fields from integration_schedules
  scheduleId: string | null
  scheduleType: "Manual" | "Interval" | "Cron" | null
  intervalMinutes: number | null
  cronExpression: string | null
  scheduleEnabled: boolean | null
  successfulRuns: number
}

export type IntegrationRun = {
  id: string
  integrationId: string
  triggerType: "Manual" | "Schedule" | "API"
  scheduleId: string | null
  status: "Started" | "Success" | "Partial" | "Failed"
  startedAt: string
  finishedAt: string | null
  recordsProcessed: number | null
  recordsFailed: number | null
  errorMessage: string | null
  runSummary: Record<string, any> | null
}

/* ───────────────────────────────────────────── */
/* Database Row Types (internal)                 */
/* ───────────────────────────────────────────── */

export type IntegrationRow = {
  id: string
  type: string
  displayName: string
  apiBaseUrl: string
  authType: string
  credentialEnvRefs: Record<string, string>
  normalizedTableName: string | null
  schemaInitialized: boolean
  status: "Active" | "Disabled" | "Error"
  lastSyncAt: string | null
  lastError: string | null
  createdAt: string
  scheduleId: string | null
  scheduleType: "Manual" | "Interval" | "Cron" | null
  intervalMinutes: number | null
  cronExpression: string | null
  scheduleEnabled: boolean | null
  successfulRuns: number
}

export type IntegrationRunRow = {
  id: string
  integrationId: string
  triggerType: "Manual" | "Schedule" | "API"
  scheduleId: string | null
  status: "Started" | "Success" | "Partial" | "Failed"
  startedAt: string
  finishedAt: string | null
  recordsProcessed: number | null
  recordsFailed: number | null
  errorMessage: string | null
  runSummary: Record<string, any> | null
}