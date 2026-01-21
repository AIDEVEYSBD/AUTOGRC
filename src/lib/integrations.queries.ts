import { db } from "./db"
import type {
  Integration,
  IntegrationRun,
  IntegrationRow,
  IntegrationRunRow,
} from "./integrations.types"

/* ───────────────────────────────────────────── */
/* Queries                                       */
/* ───────────────────────────────────────────── */

/**
 * Get all integrations with schedule and run statistics
 */
export async function getIntegrations(): Promise<Integration[]> {
  const rows = await db<IntegrationRow[]>`
    SELECT 
      i.id,
      i.type,
      i.display_name AS "displayName",
      i.api_base_url AS "apiBaseUrl",
      i.auth_type AS "authType",
      i.credential_env_refs AS "credentialEnvRefs",
      i.normalized_table_name AS "normalizedTableName",
      i.schema_initialized AS "schemaInitialized",
      i.status,
      i.last_sync_at AS "lastSyncAt",
      i.last_error AS "lastError",
      -- Schedule info
      s.id AS "scheduleId",
      s.schedule_type AS "scheduleType",
      s.interval_minutes AS "intervalMinutes",
      s.cron_expression AS "cronExpression",
      s.enabled AS "scheduleEnabled",
      -- Successful runs count
      (
        SELECT COUNT(*)::int 
        FROM integration_runs 
        WHERE integration_id = i.id AND status = 'Success'
      ) AS "successfulRuns"
    FROM integrations i
    LEFT JOIN integration_schedules s ON s.integration_id = i.id
    ORDER BY i.display_name
  `
  
  return rows
}

/**
 * Get single integration by ID
 */
export async function getIntegrationById(id: string): Promise<Integration | null> {
  const rows = await db<IntegrationRow[]>`
    SELECT 
      i.id,
      i.type,
      i.display_name AS "displayName",
      i.api_base_url AS "apiBaseUrl",
      i.auth_type AS "authType",
      i.credential_env_refs AS "credentialEnvRefs",
      i.normalized_table_name AS "normalizedTableName",
      i.schema_initialized AS "schemaInitialized",
      i.status,
      i.last_sync_at AS "lastSyncAt",
      i.last_error AS "lastError",
      i.created_at AS "createdAt",
      -- Schedule info
      s.id AS "scheduleId",
      s.schedule_type AS "scheduleType",
      s.interval_minutes AS "intervalMinutes",
      s.cron_expression AS "cronExpression",
      s.enabled AS "scheduleEnabled",
      -- Successful runs count
      (
        SELECT COUNT(*)::int 
        FROM integration_runs 
        WHERE integration_id = i.id AND status = 'Success'
      ) AS "successfulRuns"
    FROM integrations i
    LEFT JOIN integration_schedules s ON s.integration_id = i.id
    WHERE i.id = ${id}
  `
  
  return rows[0] ?? null
}

/**
 * Update integration status (Activate/Deactivate)
 */
export async function updateIntegrationStatus(
  id: string, 
  status: "Active" | "Disabled" | "Error"
): Promise<void> {
  await db`
    UPDATE integrations
    SET status = ${status}
    WHERE id = ${id}
  `
}

/**
 * Update integration credential references
 * (References to env vars, not actual secrets)
 */
export async function updateIntegrationCredentials(
  id: string,
  credentialEnvRefs: Record<string, string>
): Promise<void> {
  await db`
    UPDATE integrations
    SET credential_env_refs = ${JSON.stringify(credentialEnvRefs)}
    WHERE id = ${id}
  `
}

/**
 * Update schema initialization after first successful run
 */
export async function updateSchemaInitialization(
  id: string,
  normalizedTableName: string
): Promise<void> {
  await db`
    UPDATE integrations
    SET 
      schema_initialized = true,
      normalized_table_name = ${normalizedTableName}
    WHERE id = ${id}
  `
}

/**
 * Update last sync timestamp and clear errors
 */
export async function updateLastSync(
  id: string,
  lastSyncAt: string = new Date().toISOString()
): Promise<void> {
  await db`
    UPDATE integrations
    SET 
      last_sync_at = ${lastSyncAt},
      last_error = NULL,
      status = 'Active'
    WHERE id = ${id}
  `
}

/**
 * Update integration error status
 */
export async function updateIntegrationError(
  id: string,
  errorMessage: string
): Promise<void> {
  await db`
    UPDATE integrations
    SET 
      status = 'Error',
      last_error = ${errorMessage}
    WHERE id = ${id}
  `
}

/**
 * Create new integration run
 * Returns the run ID
 */
export async function createRun(
  integrationId: string,
  triggerType: "Manual" | "Schedule" | "API" = "Manual",
  scheduleId?: string
): Promise<string> {
  const runId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  await db`
    INSERT INTO integration_runs (
      id,
      integration_id,
      trigger_type,
      schedule_id,
      status,
      started_at
    ) VALUES (
      ${runId},
      ${integrationId},
      ${triggerType},
      ${scheduleId ?? null},
      'Started',
      NOW()
    )
  `
  
  return runId
}

/**
 * Update existing run with results
 */
export async function updateRun(
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
  const updates: string[] = []
  const values: any[] = []
  
  if (data.status !== undefined) {
    updates.push(`status = $${values.length + 1}`)
    values.push(data.status)
  }
  
  if (data.finishedAt !== undefined) {
    updates.push(`finished_at = $${values.length + 1}`)
    values.push(data.finishedAt)
  }
  
  if (data.recordsProcessed !== undefined) {
    updates.push(`records_processed = $${values.length + 1}`)
    values.push(data.recordsProcessed)
  }
  
  if (data.recordsFailed !== undefined) {
    updates.push(`records_failed = $${values.length + 1}`)
    values.push(data.recordsFailed)
  }
  
  if (data.errorMessage !== undefined) {
    updates.push(`error_message = $${values.length + 1}`)
    values.push(data.errorMessage)
  }
  
  if (data.runSummary !== undefined) {
    updates.push(`run_summary = $${values.length + 1}`)
    values.push(JSON.stringify(data.runSummary))
  }
  
  if (updates.length === 0) return
  
  await db.unsafe(`
    UPDATE integration_runs
    SET ${updates.join(', ')}
    WHERE id = $${values.length + 1}
  `, [...values, id])
}

/**
 * Get recent runs for an integration (or all integrations)
 */
export async function getRecentRuns(
  integrationId?: string,
  limit: number = 50
): Promise<IntegrationRun[]> {
  if (integrationId) {
    const rows = await db<IntegrationRunRow[]>`
      SELECT 
        id,
        integration_id AS "integrationId",
        trigger_type AS "triggerType",
        schedule_id AS "scheduleId",
        status,
        started_at AS "startedAt",
        finished_at AS "finishedAt",
        records_processed AS "recordsProcessed",
        records_failed AS "recordsFailed",
        error_message AS "errorMessage",
        run_summary AS "runSummary"
      FROM integration_runs
      WHERE integration_id = ${integrationId}
      ORDER BY started_at DESC
      LIMIT ${limit}
    `
    return rows
  } else {
    const rows = await db<IntegrationRunRow[]>`
      SELECT 
        id,
        integration_id AS "integrationId",
        trigger_type AS "triggerType",
        schedule_id AS "scheduleId",
        status,
        started_at AS "startedAt",
        finished_at AS "finishedAt",
        records_processed AS "recordsProcessed",
        records_failed AS "recordsFailed",
        error_message AS "errorMessage",
        run_summary AS "runSummary"
      FROM integration_runs
      ORDER BY started_at DESC
      LIMIT ${limit}
    `
    return rows
  }
}

/**
 * Get data from a normalized integration table
 * (Generic query for any integration's result table)
 */
export async function getNormalizedData(
  tableName: string,
  limit: number = 1000
): Promise<Record<string, any>[]> {
  // Validate table name to prevent SQL injection
  // Table names should follow pattern: {integration_id}_data or similar
  if (!/^[a-z0-9_]+$/.test(tableName)) {
    throw new Error("Invalid table name")
  }
  
  // Check if table exists first
  const tableExists = await normalizedTableExists(tableName)
  if (!tableExists) {
    return []
  }
  
  // Query without ORDER BY since we don't know what columns exist
  const rows = await db.unsafe(`
    SELECT * 
    FROM ${tableName}
    LIMIT ${limit}
  `)
  
  return rows as Record<string, any>[]
}

/**
 * Check if a normalized table exists
 */
export async function normalizedTableExists(tableName: string): Promise<boolean> {
  if (!/^[a-z0-9_]+$/.test(tableName)) {
    return false
  }
  
  const result = await db<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_name = ${tableName}
    ) as exists
  `
  
  return result[0]?.exists ?? false
}

/* ───────────────────────────────────────────── */
/* Schedule Management                           */
/* ───────────────────────────────────────────── */

/**
 * Get or create schedule for an integration
 */
export async function getOrCreateSchedule(integrationId: string): Promise<{
  id: string
  scheduleType: "Manual" | "Interval" | "Cron"
  intervalMinutes: number | null
  cronExpression: string | null
  enabled: boolean
}> {
  // Check if schedule exists
  const existing = await db<Array<{
    id: string
    scheduleType: "Manual" | "Interval" | "Cron"
    intervalMinutes: number | null
    cronExpression: string | null
    enabled: boolean
  }>>`
    SELECT 
      id,
      schedule_type AS "scheduleType",
      interval_minutes AS "intervalMinutes",
      cron_expression AS "cronExpression",
      enabled
    FROM integration_schedules
    WHERE integration_id = ${integrationId}
  `
  
  if (existing.length > 0) {
    return existing[0]
  }
  
  // Create default schedule
  const scheduleId = `sched_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  await db`
    INSERT INTO integration_schedules (
      id,
      integration_id,
      schedule_type,
      enabled
    ) VALUES (
      ${scheduleId},
      ${integrationId},
      'Manual',
      false
    )
  `
  
  return {
    id: scheduleId,
    scheduleType: "Manual",
    intervalMinutes: null,
    cronExpression: null,
    enabled: false,
  }
}

/**
 * Update integration schedule
 */
export async function updateSchedule(
  scheduleId: string,
  data: {
    scheduleType?: "Manual" | "Interval" | "Cron"
    intervalMinutes?: number | null
    cronExpression?: string | null
    enabled?: boolean
  }
): Promise<void> {
  const updates: string[] = []
  const values: any[] = []
  
  if (data.scheduleType !== undefined) {
    updates.push(`schedule_type = $${values.length + 1}`)
    values.push(data.scheduleType)
  }
  
  if (data.intervalMinutes !== undefined) {
    updates.push(`interval_minutes = $${values.length + 1}`)
    values.push(data.intervalMinutes)
  }
  
  if (data.cronExpression !== undefined) {
    updates.push(`cron_expression = $${values.length + 1}`)
    values.push(data.cronExpression)
  }
  
  if (data.enabled !== undefined) {
    updates.push(`enabled = $${values.length + 1}`)
    values.push(data.enabled)
  }
  
  if (updates.length === 0) return
  
  await db.unsafe(`
    UPDATE integration_schedules
    SET ${updates.join(', ')}
    WHERE id = $${values.length + 1}
  `, [...values, scheduleId])
}

/**
 * Update schedule run timestamps
 */
export async function updateScheduleRunTimestamps(
  scheduleId: string,
  lastRunAt: string,
  nextRunAt: string | null
): Promise<void> {
  await db`
    UPDATE integration_schedules
    SET 
      last_run_at = ${lastRunAt},
      next_run_at = ${nextRunAt}
    WHERE id = ${scheduleId}
  `
}