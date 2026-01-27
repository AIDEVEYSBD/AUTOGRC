// lib/automations.queries.ts

import { neon } from "@neondatabase/serverless"
import type {
  Automation,
  AutomationRun,
  ControlOption,
  ApplicabilityCategoryOption,
  ApplicationOption,
  IntegrationTableOption,
  TableColumn,
  QueryPreviewResult,
} from "./automations.types"

const db = neon(process.env.DATABASE_URL!)

/* ───────────────────────────────────────────── */
/* Automations                                   */
/* ───────────────────────────────────────────── */

export async function getAutomations(): Promise<Automation[]> {
  try {
    const rows = await db`
      SELECT
        a.id,
        a.name,
        a.description,
        a.control_id AS "controlId",
        COALESCE(c.control_code, 'N/A') AS "controlCode",
        COALESCE(c.control_statement, 'Unknown Control') AS "controlTitle",
        a.apply_scope AS "applyScope",
        a.applicability_ids AS "applicabilityIds",
        a.application_ids AS "applicationIds",
        a.sql_text AS "sqlText",
        a.source_integrations AS "sourceIntegrations",
        a.answer_pass AS "answerPass",
        a.answer_fail AS "answerFail",
        a.created_at AS "createdAt"
      FROM automations a
      LEFT JOIN controls c ON c.id = a.control_id
      ORDER BY a.created_at DESC
    `

    // Get run stats separately to avoid complex aggregation issues
    const results: Automation[] = []
    
    for (const r of rows) {
      let lastRunAt = null
      let lastRunStatus = null
      let totalRuns = 0
      let successfulRuns = 0
      let failedRuns = 0

      try {
        const runStats = await db`
          SELECT
            MAX(started_at) AS "lastRunAt",
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE status = 'Success') AS success,
            COUNT(*) FILTER (WHERE status = 'Failed') AS failed
          FROM automation_runs
          WHERE automation_id = ${r.id}
        `
        
        if (runStats.length > 0) {
          const stats: any = runStats[0]
          lastRunAt = stats.lastRunAt
          totalRuns = Number(stats.total) || 0
          successfulRuns = Number(stats.success) || 0
          failedRuns = Number(stats.failed) || 0

          // Get last run status
          if (totalRuns > 0) {
            const lastRun = await db`
              SELECT status
              FROM automation_runs
              WHERE automation_id = ${r.id}
              ORDER BY started_at DESC
              LIMIT 1
            `
            if (lastRun.length > 0) {
              lastRunStatus = (lastRun[0] as any).status
            }
          }
        }
      } catch (err) {
        console.error(`Failed to get run stats for automation ${r.id}:`, err)
      }

      results.push({
        id: r.id,
        name: r.name,
        description: r.description,
        controlId: r.controlId,
        controlCode: r.controlCode,
        controlTitle: r.controlTitle,
        applyScope: r.applyScope,
        applicabilityIds: r.applicabilityIds || null,
        applicationIds: r.applicationIds || null,
        sqlText: r.sqlText,
        sourceIntegrations: r.sourceIntegrations || null,
        answerTemplate: null, // New percentage-based system - not yet in DB
        answerPass: r.answerPass,
        answerFail: r.answerFail,
        createdAt: r.createdAt,
        lastRunAt,
        lastRunStatus,
        totalRuns,
        successfulRuns,
        failedRuns,
      })
    }

    return results
  } catch (error) {
    console.error('Failed to load automations:', error)
    // Return empty array instead of throwing for POC
    return []
  }
}

export async function getAutomationById(id: string): Promise<Automation | null> {
  try {
    const rows = await db`
      SELECT
        a.id,
        a.name,
        a.description,
        a.control_id AS "controlId",
        COALESCE(c.control_code, 'N/A') AS "controlCode",
        COALESCE(c.control_statement, 'Unknown Control') AS "controlTitle",
        a.apply_scope AS "applyScope",
        a.applicability_ids AS "applicabilityIds",
        a.application_ids AS "applicationIds",
        a.sql_text AS "sqlText",
        a.source_integrations AS "sourceIntegrations",
        a.answer_pass AS "answerPass",
        a.answer_fail AS "answerFail",
        a.created_at AS "createdAt"
      FROM automations a
      LEFT JOIN controls c ON c.id = a.control_id
      WHERE a.id = ${id}
    `

    if (rows.length === 0) return null

    const r: any = rows[0]
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      controlId: r.controlId,
      controlCode: r.controlCode,
      controlTitle: r.controlTitle,
      applyScope: r.applyScope,
      applicabilityIds: r.applicabilityIds || null,
      applicationIds: r.applicationIds || null,
      sqlText: r.sqlText,
      sourceIntegrations: r.sourceIntegrations || null,
      answerTemplate: null, // New percentage-based system - not yet in DB
      answerPass: r.answerPass,
      answerFail: r.answerFail,
      createdAt: r.createdAt,
      lastRunAt: null,
      lastRunStatus: null,
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
    }
  } catch (error) {
    console.error('Failed to get automation by id:', error)
    return null
  }
}

/* ───────────────────────────────────────────── */
/* Automation Runs                               */
/* ───────────────────────────────────────────── */

export async function getAutomationRuns(automationId: string, limit: number = 20): Promise<AutomationRun[]> {
  try {
    const rows = await db`
      SELECT
        id,
        automation_id AS "automationId",
        triggered_by AS "triggeredBy",
        started_at AS "startedAt",
        finished_at AS "finishedAt",
        status,
        error_message AS "errorMessage"
      FROM automation_runs
      WHERE automation_id = ${automationId}
      ORDER BY started_at DESC
      LIMIT ${limit}
    `

    return rows.map((r: any) => ({
      id: r.id,
      automationId: r.automationId,
      triggeredBy: r.triggeredBy,
      startedAt: r.startedAt,
      finishedAt: r.finishedAt,
      status: r.status,
      errorMessage: r.errorMessage,
      appsProcessed: null, // Could be computed from assessment_evidence if needed
    }))
  } catch (error) {
    console.error('Failed to get automation runs:', error)
    return []
  }
}

export async function getRecentAutomationRuns(limit: number = 50): Promise<AutomationRun[]> {
  try {
    const rows = await db`
      SELECT
        id,
        automation_id AS "automationId",
        triggered_by AS "triggeredBy",
        started_at AS "startedAt",
        finished_at AS "finishedAt",
        status,
        error_message AS "errorMessage"
      FROM automation_runs
      ORDER BY started_at DESC
      LIMIT ${limit}
    `

    return rows.map((r: any) => ({
      id: r.id,
      automationId: r.automationId,
      triggeredBy: r.triggeredBy,
      startedAt: r.startedAt,
      finishedAt: r.finishedAt,
      status: r.status,
      errorMessage: r.errorMessage,
      appsProcessed: null,
    }))
  } catch (error) {
    console.error('Failed to get recent automation runs:', error)
    return []
  }
}

/* ───────────────────────────────────────────── */
/* Options for Form Dropdowns                    */
/* ───────────────────────────────────────────── */

export async function getControlOptions(): Promise<ControlOption[]> {
  try {
    const rows = await db`
      SELECT
        c.id,
        c.control_code AS "controlCode",
        c.control_statement,
        f.name AS "frameworkName"
      FROM controls c
      JOIN frameworks f ON f.id = c.framework_id
      WHERE f.is_master = true
      ORDER BY c.control_code
    `

    return rows.map((r: any) => ({
      id: r.id,
      controlCode: r.controlCode,
      title: r.control_statement || "Untitled Control",
      statement: r.control_statement,
      frameworkName: r.frameworkName,
    }))
  } catch (error) {
    console.error('Failed to get control options:', error)
    return []
  }
}

export async function getApplicabilityCategoryOptions(): Promise<ApplicabilityCategoryOption[]> {
  try {
    const rows = await db`
      SELECT
        id,
        name,
        description
      FROM applicability_categories
      ORDER BY name
    `

    return rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      description: r.description,
    }))
  } catch (error) {
    console.error('Failed to get applicability category options:', error)
    return []
  }
}

export async function getApplicationOptions(): Promise<ApplicationOption[]> {
  try {
    const rows = await db`
      SELECT
        id,
        name,
        primary_url AS "primaryUrl",
        criticality
      FROM applications
      ORDER BY name
    `

    return rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      primaryUrl: r.primaryUrl,
      criticality: r.criticality,
    }))
  } catch (error) {
    console.error('Failed to get application options:', error)
    return []
  }
}

export async function getIntegrationTableOptions(): Promise<IntegrationTableOption[]> {
  try {
    const rows = await db`
      SELECT
        id AS "integrationId",
        display_name AS "integrationName",
        normalized_table_name AS "tableName"
      FROM integrations
      WHERE normalized_table_name IS NOT NULL
        AND status = 'Active'
      ORDER BY display_name
    `

    return rows.map((r: any) => ({
      integrationId: r.integrationId,
      integrationName: r.integrationName,
      tableName: r.tableName,
    }))
  } catch (error) {
    console.error('Failed to get integration table options:', error)
    return []
  }
}

/* ───────────────────────────────────────────── */
/* Query Builder Helpers                         */
/* ───────────────────────────────────────────── */

export async function getTableColumns(tableName: string): Promise<TableColumn[]> {
  try {
    const rows = await db`
      SELECT
        column_name AS "columnName",
        data_type AS "dataType",
        is_nullable AS "isNullable"
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ${tableName}
      ORDER BY ordinal_position
    `

    return rows.map((r: any) => ({
      columnName: r.columnName,
      dataType: r.dataType,
      isNullable: r.isNullable === "YES",
    }))
  } catch (error) {
    console.error(`Failed to get columns for table ${tableName}:`, error)
    return []
  }
}

export async function previewQuery(sqlText: string, limit: number = 10): Promise<QueryPreviewResult> {
  try {
    // Call backend API for preview
    const apiUrl = process.env.NEXT_PUBLIC_AUTOMATIONS_API_URL || process.env.AUTOMATIONS_API_URL || "http://localhost:3104"
    
    const response = await fetch(`${apiUrl}/automations/preview`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sql_text: sqlText,
        limit: limit,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || "Preview request failed")
    }

    const result = await response.json()
    
    return {
      columns: result.columns || [],
      rows: result.rows || [],
      rowCount: result.row_count || 0,
      hasApplicationId: result.has_application_id || false,
      hasCompliancePercentage: result.has_compliance_percentage || false,
      previewData: result.preview_data || null,
      error: result.error || null,
    }
  } catch (error: any) {
    return {
      columns: [],
      rows: [],
      rowCount: 0,
      hasApplicationId: false,
      hasCompliancePercentage: false,
      previewData: null,
      error: error.message || "Query preview failed",
    }
  }
}

/* ───────────────────────────────────────────── */
/* KPIs                                          */
/* ───────────────────────────────────────────── */

export async function getAutomationKPIs() {
  try {
    const rows = await db`
      SELECT
        COUNT(DISTINCT a.id) AS "totalAutomations",
        COUNT(DISTINCT a.control_id) AS "controlsCovered",
        COUNT(ar.id) FILTER (WHERE ar.started_at >= now() - INTERVAL '24 hours') AS "runs24h",
        ROUND(
          COUNT(*) FILTER (WHERE ar.status = 'Success')::numeric / 
          NULLIF(COUNT(ar.id), 0) * 100,
          1
        ) AS "successRate"
      FROM automations a
      LEFT JOIN automation_runs ar ON ar.automation_id = a.id
    `

    const r: any = rows[0]
    return {
      totalAutomations: Number(r.totalAutomations) || 0,
      controlsCovered: Number(r.controlsCovered) || 0,
      runs24h: Number(r.runs24h) || 0,
      successRate: r.successRate ? Number(r.successRate) : 0,
    }
  } catch (error) {
    console.error('Failed to get automation KPIs:', error)
    return {
      totalAutomations: 0,
      controlsCovered: 0,
      runs24h: 0,
      successRate: 0,
    }
  }
}