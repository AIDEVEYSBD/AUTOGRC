"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { getFrameworkDetails } from "@/lib/frameworks.queries"
export const dynamic = "force-dynamic"

export async function updateControlMetadata(
  controlId: string,
  data: {
    controlType?: string | null
    controlScope?: string | null
    isAutomated?: boolean | null
  }
) {
  try {
    await db`
      UPDATE controls
      SET
        control_type = ${data.controlType ?? null},
        control_scope = ${data.controlScope ?? null},
        is_automated = ${data.isAutomated ?? null}
      WHERE id = ${controlId}
    `

    revalidatePath("/frameworks")
    return { success: true }
  } catch (error) {
    console.error("Failed to update control metadata:", error)
    return { success: false, error: "Failed to update control" }
  }
}

export async function updateControlApplicabilities(
  controlId: string,
  applicabilityIds: string[]
) {
  try {
    // Delete existing applicabilities
    await db`
      DELETE FROM control_applicability
      WHERE control_id = ${controlId}
    `

    // Insert new applicabilities
    if (applicabilityIds.length > 0) {
      await db`
        INSERT INTO control_applicability (control_id, applicability_id)
        SELECT ${controlId}, unnest(${applicabilityIds}::text[])
      `
    }

    revalidatePath("/frameworks")
    return { success: true }
  } catch (error) {
    console.error("Failed to update control applicabilities:", error)
    return { success: false, error: "Failed to update applicabilities" }
  }
}

export async function fetchFrameworkDetails(frameworkId: string) {
  return await getFrameworkDetails(frameworkId)
}