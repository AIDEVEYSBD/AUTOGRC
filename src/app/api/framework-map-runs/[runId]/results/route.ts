import { NextResponse } from "next/server"
import { db } from "@/lib/db"

type FrameworkMapRunRow = {
  id: string
  source_framework_id: string
  target_framework_id: string
  status: string
  created_at: string
  completed_at: string | null
}

type FrameworkRow = {
  id: string
  name: string
}

type MapStatsRow = {
  total_mappings: number
  full_overlap: number
  partial_overlap: number
  avg_score: number
}

type MappingRow = {
  id: string
  map_run_id: string
  source_control_id: string
  target_control_id: string
  overlap_score: number
  status: string
  explanation: string
  created_at: string
  source_control_code: string
  source_domain: string
  source_sub_domain: string | null
  source_control_statement: string
  target_control_code: string
  target_control_statement: string
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params

    // Fetch the run metadata
    const runs = await db<FrameworkMapRunRow[]>`
      SELECT 
        id,
        source_framework_id,
        target_framework_id,
        status,
        created_at,
        completed_at
      FROM framework_map_runs
      WHERE id = ${runId}
    `

    if (runs.length === 0) {
      return NextResponse.json({ error: "Framework map run not found" }, { status: 404 })
    }

    const run = runs[0]

    // Fetch framework names
    const frameworks = await db<FrameworkRow[]>`
      SELECT id, name
      FROM frameworks
      WHERE id = ANY(${[run.source_framework_id, run.target_framework_id]})
    `

    const frameworkMap = new Map(frameworks.map((f) => [f.id, f.name]))

    // Calculate summary stats
    const summaryResult = await db<MapStatsRow[]>`
      SELECT 
        COUNT(*)::int as total_mappings,
        COUNT(*) FILTER (WHERE status = 'Full Overlap')::int as full_overlap,
        COUNT(*) FILTER (WHERE status = 'Partial Overlap')::int as partial_overlap,
        COALESCE(AVG(overlap_score), 0)::float as avg_score
      FROM framework_maps
      WHERE map_run_id = ${runId}
    `

    const summary = summaryResult[0] || {
      total_mappings: 0,
      full_overlap: 0,
      partial_overlap: 0,
      avg_score: 0,
    }

    // Fetch all mappings with control details
    const mappings = await db<MappingRow[]>`
      SELECT 
        fm.id,
        fm.map_run_id,
        fm.source_control_id,
        fm.target_control_id,
        fm.overlap_score,
        fm.status,
        fm.explanation,
        fm.created_at,
        sc.control_code as source_control_code,
        sc.domain as source_domain,
        sc.sub_domain as source_sub_domain,
        sc.control_statement as source_control_statement,
        tc.control_code as target_control_code,
        tc.control_statement as target_control_statement
      FROM framework_maps fm
      INNER JOIN controls sc ON fm.source_control_id = sc.id
      INNER JOIN controls tc ON fm.target_control_id = tc.id
      WHERE fm.map_run_id = ${runId}
      ORDER BY sc.domain, sc.sub_domain, sc.control_code
    `

    // Format response
    const response = {
      run: {
        id: run.id,
        source_framework_name: frameworkMap.get(run.source_framework_id) || "Unknown",
        target_framework_name: frameworkMap.get(run.target_framework_id) || "Unknown",
        status: run.status,
        created_at: run.created_at,
        completed_at: run.completed_at,
      },
      summary: {
        total_mappings: summary.total_mappings,
        full_overlap: summary.full_overlap,
        partial_overlap: summary.partial_overlap,
        avg_score: summary.avg_score,
      },
      mappings: mappings.map((m) => ({
        source_control_code: m.source_control_code,
        source_domain: m.source_domain,
        source_sub_domain: m.source_sub_domain,
        source_control_statement: m.source_control_statement,
        target_control_code: m.target_control_code,
        target_control_statement: m.target_control_statement,
        overlap_score: m.overlap_score,
        status: m.status,
        explanation: m.explanation,
      })),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error fetching framework map results:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch framework map results",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}