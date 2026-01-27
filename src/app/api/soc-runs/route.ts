import { NextResponse } from "next/server"
import { db } from "@/lib/db"

type SocRunRow = {
  id: string
  master_framework_id: string
  soc_report_name: string
  status: string
  created_at: string
  completed_at: string | null
  params: string | null
  error: string | null
}

type FrameworkRow = {
  id: string
  name: string
}

export async function GET() {
  try {
    // Fetch all SOC runs
    const runs = await db<SocRunRow[]>`
      SELECT 
        id,
        master_framework_id,
        soc_report_name,
        status,
        created_at,
        completed_at,
        params,
        error
      FROM soc_runs
      ORDER BY created_at DESC
    `

    // Fetch framework names for all runs
    const frameworkIds = [...new Set(runs.map((r) => r.master_framework_id))]
    
    const frameworks = await db<FrameworkRow[]>`
      SELECT id, name
      FROM frameworks
      WHERE id = ANY(${frameworkIds})
    `

    const frameworkMap = new Map(frameworks.map((f) => [f.id, f.name]))

    // Map to response format
    const response = runs.map((run) => ({
      id: run.id,
      status: run.status,
      created_at: run.created_at,
      completed_at: run.completed_at,
      soc_report_name: run.soc_report_name,
      master_framework_name: frameworkMap.get(run.master_framework_id) || "Unknown",
    }))

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error fetching SOC runs:", error)
    return NextResponse.json(
      { error: "Failed to fetch SOC runs", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}