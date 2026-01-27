import { NextResponse } from "next/server"
import { db } from "@/lib/db"

type SocRunRow = {
  id: string
  master_framework_id: string
  soc_report_name: string
  status: string
  created_at: string
  completed_at: string | null
}

type FrameworkRow = {
  name: string
}

type ResultRow = {
  id: string
  soc_run_id: string
  control_id: string
  domain: string
  sub_domain: string | null
  control_statement: string
  soc_control_code: string
  soc_control_statement: string
  score: number
  status: string
  explanation: string
  created_at: string
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params

    // Fetch the run metadata
    const runs = await db<SocRunRow[]>`
      SELECT 
        id,
        master_framework_id,
        soc_report_name,
        status,
        created_at,
        completed_at
      FROM soc_runs
      WHERE id = ${runId}
    `

    if (runs.length === 0) {
      return NextResponse.json({ error: "SOC run not found" }, { status: 404 })
    }

    const run = runs[0]

    // Fetch framework name
    const frameworks = await db<FrameworkRow[]>`
      SELECT name
      FROM frameworks
      WHERE id = ${run.master_framework_id}
    `

    const master_framework_name = frameworks[0]?.name || "Unknown"

    // Fetch all results for this run
    const results = await db<ResultRow[]>`
      SELECT 
        id,
        soc_run_id,
        control_id,
        domain,
        sub_domain,
        control_statement,
        soc_control_code,
        soc_control_statement,
        score,
        status,
        explanation,
        created_at
      FROM soc_mapper_results
      WHERE soc_run_id = ${runId}
      ORDER BY domain, sub_domain, control_id
    `

    // Format response
    const response = {
      run: {
        id: run.id,
        status: run.status,
        created_at: run.created_at,
        completed_at: run.completed_at,
        soc_report_name: run.soc_report_name,
        master_framework_name,
      },
      results: results.map((r) => ({
        control_id: r.control_id,
        domain: r.domain,
        sub_domain: r.sub_domain,
        control_statement: r.control_statement,
        soc_control_code: r.soc_control_code,
        soc_control_statement: r.soc_control_statement,
        score: r.score,
        status: r.status,
        explanation: r.explanation,
        created_at: r.created_at,
      })),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error fetching SOC run results:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch SOC run results",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}