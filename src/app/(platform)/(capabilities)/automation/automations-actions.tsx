// app/(platform)/automations/automations-actions.ts

"use server"

import { neon } from "@neondatabase/serverless"
import { revalidatePath } from "next/cache"
import {
  getAutomations,
  getAutomationById,
  getAutomationRuns,
  getControlOptions,
  getApplicabilityCategoryOptions,
  getApplicationOptions,
  getIntegrationTableOptions,
  getTableColumns,
  previewQuery,
  getAutomationKPIs,
} from "@/lib/automations.queries"
import type {
  Automation,
  AutomationRun,
  ControlOption,
  ApplicabilityCategoryOption,
  ApplicationOption,
  IntegrationTableOption,
  TableColumn,
  QueryPreviewResult,
} from "@/lib/automations.types"

const db = neon(process.env.DATABASE_URL!)

/* ───────────────────────────────────────────── */
/* Fetch Actions                                 */
/* ───────────────────────────────────────────── */

export async function fetchAutomations(): Promise<Automation[]> {
  return await getAutomations()
}

export async function fetchAutomationById(id: string): Promise<Automation | null> {
  return await getAutomationById(id)
}

export async function fetchAutomationRuns(automationId: string, limit?: number): Promise<AutomationRun[]> {
  return await getAutomationRuns(automationId, limit)
}

export async function fetchControlOptions(): Promise<ControlOption[]> {
  return await getControlOptions()
}

export async function fetchApplicabilityCategoryOptions(): Promise<ApplicabilityCategoryOption[]> {
  return await getApplicabilityCategoryOptions()
}

export async function fetchApplicationOptions(): Promise<ApplicationOption[]> {
  return await getApplicationOptions()
}

export async function fetchIntegrationTableOptions(): Promise<IntegrationTableOption[]> {
  return await getIntegrationTableOptions()
}

export async function fetchTableColumns(tableName: string): Promise<TableColumn[]> {
  return await getTableColumns(tableName)
}

export async function fetchQueryPreview(sqlText: string, limit?: number): Promise<QueryPreviewResult> {
  return await previewQuery(sqlText, limit)
}

export async function fetchAutomationKPIs() {
  return await getAutomationKPIs()
}

/* ───────────────────────────────────────────── */
/* Create/Update/Delete Actions                  */
/* ───────────────────────────────────────────── */

export async function createAutomation(data: {
  name: string
  description: string | null
  controlId: string
  applyScope: "AllApplications" | "ByApplicability" | "SelectedApplications"
  applicabilityIds: string[] | null
  applicationIds: string[] | null
  sqlText: string
  sourceIntegrations: string[] | null
  answerPass: string
  answerFail: string
}): Promise<{ success: boolean; error?: string; automationId?: string }> {
  try {
    const id = crypto.randomUUID()

    await db`
      INSERT INTO automations (
        id,
        name,
        description,
        control_id,
        apply_scope,
        applicability_ids,
        application_ids,
        sql_text,
        source_integrations,
        answer_pass,
        answer_fail
      )
      VALUES (
        ${id},
        ${data.name},
        ${data.description},
        ${data.controlId},
        ${data.applyScope},
        ${JSON.stringify(data.applicabilityIds)},
        ${JSON.stringify(data.applicationIds)},
        ${data.sqlText},
        ${JSON.stringify(data.sourceIntegrations)},
        ${data.answerPass},
        ${data.answerFail}
      )
    `

    revalidatePath("/automations")
    return { success: true, automationId: id }
  } catch (error: any) {
    console.error("Failed to create automation:", error)
    return { success: false, error: error.message || "Failed to create automation" }
  }
}

export async function updateAutomation(
  id: string,
  data: {
    name: string
    description: string | null
    controlId: string
    applyScope: "AllApplications" | "ByApplicability" | "SelectedApplications"
    applicabilityIds: string[] | null
    applicationIds: string[] | null
    sqlText: string
    sourceIntegrations: string[] | null
    answerPass: string
    answerFail: string
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    await db`
      UPDATE automations
      SET
        name = ${data.name},
        description = ${data.description},
        control_id = ${data.controlId},
        apply_scope = ${data.applyScope},
        applicability_ids = ${JSON.stringify(data.applicabilityIds)},
        application_ids = ${JSON.stringify(data.applicationIds)},
        sql_text = ${data.sqlText},
        source_integrations = ${JSON.stringify(data.sourceIntegrations)},
        answer_pass = ${data.answerPass},
        answer_fail = ${data.answerFail}
      WHERE id = ${id}
    `

    revalidatePath("/automations")
    return { success: true }
  } catch (error: any) {
    console.error("Failed to update automation:", error)
    return { success: false, error: error.message || "Failed to update automation" }
  }
}

export async function deleteAutomation(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await db`
      DELETE FROM automations
      WHERE id = ${id}
    `

    revalidatePath("/automations")
    return { success: true }
  } catch (error: any) {
    console.error("Failed to delete automation:", error)
    return { success: false, error: error.message || "Failed to delete automation" }
  }
}

/* ───────────────────────────────────────────── */
/* Execute Automation                            */
/* ───────────────────────────────────────────── */

export async function executeAutomation(
  automationId: string,
  triggeredBy: "Manual" | "Schedule" = "Manual"
): Promise<{ success: boolean; error?: string; runId?: string }> {
  try {
    // Call the FastAPI backend
    const apiUrl = process.env.AUTOMATIONS_API_URL || "http://localhost:3104"
    const response = await fetch(`${apiUrl}/automations/${automationId}/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ triggered_by: triggeredBy }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || "Automation execution failed")
    }

    const result = await response.json()

    revalidatePath("/automations")
    return { success: true, runId: result.run_id }
  } catch (error: any) {
    console.error("Failed to execute automation:", error)
    return { success: false, error: error.message || "Failed to execute automation" }
  }
}