import { NextResponse } from "next/server"
import { db } from "@/lib/db"

type FrameworkMapRunRow = {
  id: string
  source_framework_id: string
  target_framework_id: string
  status: string
  created_at: string
  completed_at: string | null
  model: string | null
  params: string | null
  error: string | null
}

type FrameworkRow = {
  id: string
  name: string
}

type MapStatsRow = {
  map_run_id: string
  total_mappings: number
  full_overlap: number
  partial_overlap: number
  avg_score: number
}

export async function GET() {
  try {
    // Fetch all framework map runs
    const runs = await db<FrameworkMapRunRow[]>`
      SELECT 
        id,
        source_framework_id,
        target_framework_id,
        status,
        created_at,
        completed_at,
        model,
        params,
        error
      FROM framework_map_runs
      ORDER BY created_at DESC
    `

    // Fetch framework names for all runs
    const frameworkIds = [
      ...new Set([
        ...runs.map((r) => r.source_framework_id),
        ...runs.map((r) => r.target_framework_id),
      ]),
    ]

    const frameworks = await db<FrameworkRow[]>`
      SELECT id, name
      FROM frameworks
      WHERE id = ANY(${frameworkIds})
    `

    const frameworkMap = new Map(frameworks.map((f) => [f.id, f.name]))

    // Calculate summary stats for each run
    const runIds = runs.map((r) => r.id)
    
    const stats = await db<MapStatsRow[]>`
      SELECT 
        map_run_id,
        COUNT(*)::int as total_mappings,
        COUNT(*) FILTER (WHERE status = 'Full Overlap')::int as full_overlap,
        COUNT(*) FILTER (WHERE status = 'Partial Overlap')::int as partial_overlap,
        COALESCE(AVG(overlap_score), 0)::float as avg_score
      FROM framework_maps
      WHERE map_run_id = ANY(${runIds})
      GROUP BY map_run_id
    `

    const statsMap = new Map(stats.map((s) => [s.map_run_id, s]))

    // Map to response format
    const response = runs.map((run) => {
      const runStats = statsMap.get(run.id) || {
        total_mappings: 0,
        full_overlap: 0,
        partial_overlap: 0,
        avg_score: 0,
      }

      return {
        id: run.id,
        source_framework_name: frameworkMap.get(run.source_framework_id) || "Unknown",
        target_framework_name: frameworkMap.get(run.target_framework_id) || "Unknown",
        status: run.status,
        summary: {
          total_mappings: runStats.total_mappings,
          full_overlap: runStats.full_overlap,
          partial_overlap: runStats.partial_overlap,
          avg_score: runStats.avg_score,
        },
        created_at: run.created_at,
        completed_at: run.completed_at,
      }
    })

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error fetching framework map runs:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch framework map runs",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}