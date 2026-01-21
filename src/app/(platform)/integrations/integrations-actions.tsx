"use server"

import {
  getIntegrations,
  getIntegrationById,
  updateIntegrationStatus,
  updateIntegrationCredentials,
  updateSchemaInitialization,
  updateLastSync,
  updateIntegrationError,
  createRun,
  updateRun,
  getRecentRuns,
  getNormalizedData,
  normalizedTableExists,
  getOrCreateSchedule,
  updateSchedule,
  updateScheduleRunTimestamps,
} from "@/lib/integrations.queries"

import type { Integration, IntegrationRun } from "@/lib/integrations.types"

/* ───────────────────────────────────────────── */
/* Server Actions for Client Components          */
/* ───────────────────────────────────────────── */

export async function fetchIntegrations(): Promise<Integration[]> {
  return await getIntegrations()
}

export async function fetchIntegrationById(id: string): Promise<Integration | null> {
  return await getIntegrationById(id)
}

export async function activateIntegration(id: string): Promise<void> {
  await updateIntegrationStatus(id, "Active")
}

export async function deactivateIntegration(id: string): Promise<void> {
  await updateIntegrationStatus(id, "Disabled")
}

export async function setIntegrationError(id: string, errorMessage: string): Promise<void> {
  await updateIntegrationError(id, errorMessage)
}

export async function saveIntegrationCredentials(
  id: string,
  credentials: Record<string, string>
): Promise<void> {
  await updateIntegrationCredentials(id, credentials)
}

export async function initializeSchema(
  id: string,
  normalizedTableName: string
): Promise<void> {
  await updateSchemaInitialization(id, normalizedTableName)
}

export async function syncIntegration(
  id: string,
  lastSyncAt?: string
): Promise<void> {
  await updateLastSync(id, lastSyncAt)
}

export async function startRun(
  integrationId: string,
  triggerType?: "Manual" | "Schedule" | "API",
  scheduleId?: string
): Promise<string> {
  return await createRun(integrationId, triggerType, scheduleId)
}

export async function completeRun(
  id: string,
  data: Partial<{
    status: "Started" | "Success" | "Partial" | "Failed"
    finishedAt: string
    recordsProcessed: number
    recordsFailed: number
    errorMessage: string
    runSummary: Record<string, any>
  }>
): Promise<void> {
  await updateRun(id, data)
}

export async function fetchRecentRuns(
  integrationId?: string,
  limit?: number
): Promise<IntegrationRun[]> {
  return await getRecentRuns(integrationId, limit)
}

export async function fetchNormalizedData(
  tableName: string,
  limit?: number
): Promise<Record<string, any>[]> {
  return await getNormalizedData(tableName, limit)
}

export async function checkNormalizedTableExists(tableName: string): Promise<boolean> {
  return await normalizedTableExists(tableName)
}

/* ───────────────────────────────────────────── */
/* Schedule Management Actions                   */
/* ───────────────────────────────────────────── */

export async function fetchOrCreateSchedule(integrationId: string): Promise<{
  id: string
  scheduleType: "Manual" | "Interval" | "Cron"
  intervalMinutes: number | null
  cronExpression: string | null
  enabled: boolean
}> {
  return await getOrCreateSchedule(integrationId)
}

export async function saveSchedule(
  scheduleId: string,
  data: {
    scheduleType?: "Manual" | "Interval" | "Cron"
    intervalMinutes?: number | null
    cronExpression?: string | null
    enabled?: boolean
  }
): Promise<void> {
  await updateSchedule(scheduleId, data)
}

export async function updateScheduleTimestamps(
  scheduleId: string,
  lastRunAt: string,
  nextRunAt: string | null
): Promise<void> {
  await updateScheduleRunTimestamps(scheduleId, lastRunAt, nextRunAt)
}