import "server-only"
import { db } from "@/lib/db"

/* =========================
   Types
========================= */

export type FrameworkOverview = {
  totalFrameworks: number
  totalControls: number
  masterFramework: {
    id: string
    name: string
  } | null
  frameworks: {
    id: string
    name: string
    version: string | null
    isMaster: boolean
    totalControls: number
    mappedControls: number
    percentMapped: number
    organizationScopeControls: number
    applicationScopeControls: number
    automatedControls: number
  }[]
}

export type FrameworkComparisonCell = {
  targetControlCode: string
  targetStatement: string
  overlapScore: number
  status: string
}

export type FrameworkComparisonRow = {
  controlId: string
  domain: string
  controlCode: string
  statement: string
  controlType: string | null
  controlScope: string | null
  isAutomated: boolean | null
  applicabilityCategories: string[]
  mappings: Record<string, FrameworkComparisonCell[]>
}

export type FrameworkComparisonData = {
  masterFramework: { id: string; name: string } | null
  domains: string[]
  frameworks: { id: string; name: string }[]
  rows: FrameworkComparisonRow[]
}

export type UnmappedFrameworkSummary = {
  id: string
  name: string
  unmappedCount: number
}

export type UnmappedControlRow = {
  id: string
  domain: string
  subDomain: string | null
  controlCode: string
  statement: string
  controlType: string | null
  controlScope: string | null
  isAutomated: boolean | null
  applicabilityCategories: string[]
}

export type UnmappedControlsData = {
  masterFramework: { id: string; name: string } | null
  frameworks: UnmappedFrameworkSummary[]
  activeFramework: { id: string; name: string } | null
  rows: UnmappedControlRow[]
}

/* =========================
   Framework Overview
========================= */

export async function getFrameworksOverview(): Promise<FrameworkOverview> {
  const masterResult = await db<{ id: string; name: string }[]>`
    SELECT id, name
    FROM frameworks
    WHERE is_master = true
    LIMIT 1
  `
  const master = masterResult[0] || null

  const [totalFrameworksResult, totalControlsResult] = await Promise.all([
    db<{ count: string }[]>`
      SELECT COUNT(*) AS count
      FROM frameworks
    `,
    db<{ count: string }[]>`
      SELECT COUNT(*) AS count
      FROM controls
    `,
  ])

  const totalFrameworks = Number(totalFrameworksResult[0]?.count ?? 0)
  const totalControls = Number(totalControlsResult[0]?.count ?? 0)

  const frameworksRaw = await db<{
    id: string
    name: string
    version: string | null
    is_master: boolean
    totalControls: string
    organizationScopeControls: string
    applicationScopeControls: string
    automatedControls: string
  }[]>`
    SELECT
      f.id,
      f.name,
      f.version,
      f.is_master,
      COUNT(c.id) AS "totalControls",
      COUNT(c.id) FILTER (WHERE c.control_scope = 'Organization') AS "organizationScopeControls",
      COUNT(c.id) FILTER (WHERE c.control_scope = 'Application') AS "applicationScopeControls",
      COUNT(c.id) FILTER (WHERE c.is_automated = true) AS "automatedControls"
    FROM frameworks f
    LEFT JOIN controls c ON c.framework_id = f.id
    GROUP BY f.id, f.name, f.version, f.is_master
    ORDER BY 
      CASE WHEN f.is_master THEN 0 ELSE 1 END,
      f.name ASC
  `

  if (!master) {
    return {
      totalFrameworks,
      totalControls,
      masterFramework: null,
      frameworks: frameworksRaw.map(f => ({
        id: f.id,
        name: f.name,
        version: f.version,
        isMaster: f.is_master,
        totalControls: Number(f.totalControls),
        mappedControls: 0,
        percentMapped: 0,
        organizationScopeControls: Number(f.organizationScopeControls),
        applicationScopeControls: Number(f.applicationScopeControls),
        automatedControls: Number(f.automatedControls),
      })),
    }
  }

  // Get mapping statistics for each framework
  const mappedRows = await db<{
    frameworkId: string
    mappedControls: string
  }[]>`
    SELECT
      c.framework_id AS "frameworkId",
      COUNT(DISTINCT c.id) AS "mappedControls"
    FROM framework_map_runs r
    JOIN framework_maps m ON m.map_run_id = r.id
    JOIN controls c ON c.id = m.target_control_id
    WHERE r.status = 'Completed'
      AND r.source_framework_id = ${master.id}
    GROUP BY c.framework_id
  `

  const mappedMap = new Map(
    mappedRows.map(r => [r.frameworkId, Number(r.mappedControls)])
  )

  return {
    totalFrameworks,
    totalControls,
    masterFramework: master,
    frameworks: frameworksRaw.map(f => {
      const totalControlsNum = Number(f.totalControls)
      const mapped = f.is_master ? totalControlsNum : mappedMap.get(f.id) ?? 0
      const percent =
        totalControlsNum > 0 ? Math.round((mapped / totalControlsNum) * 100) : 0

      return {
        id: f.id,
        name: f.name,
        version: f.version,
        isMaster: f.is_master,
        totalControls: totalControlsNum,
        mappedControls: mapped,
        percentMapped: percent,
        organizationScopeControls: Number(f.organizationScopeControls),
        applicationScopeControls: Number(f.applicationScopeControls),
        automatedControls: Number(f.automatedControls),
      }
    }),
  }
}

/* =========================
   Framework Comparison
========================= */

export async function getFrameworkComparisonData(): Promise<FrameworkComparisonData> {
  const masterResult = await db<{ id: string; name: string }[]>`
    SELECT id, name
    FROM frameworks
    WHERE is_master = true
    LIMIT 1
  `
  const master = masterResult[0] || null

  if (!master) {
    return { masterFramework: null, domains: [], frameworks: [], rows: [] }
  }

  const [frameworks, domains, masterControls] = await Promise.all([
    // Get all frameworks that have completed mappings from master
    db<{ id: string; name: string }[]>`
      SELECT DISTINCT
        f.id,
        f.name
      FROM framework_map_runs r
      JOIN frameworks f ON f.id = r.target_framework_id
      WHERE r.status = 'Completed'
        AND r.source_framework_id = ${master.id}
        AND f.is_master = false
      ORDER BY f.name ASC
    `,
    // Get all domains in master framework
    db<{ domain: string }[]>`
      SELECT DISTINCT domain
      FROM controls
      WHERE framework_id = ${master.id}
      ORDER BY domain ASC
    `,
    // Get all master controls with applicability
    db<{
      id: string
      domain: string
      controlCode: string
      statement: string
      controlType: string | null
      controlScope: string | null
      isAutomated: boolean | null
      applicabilityCategories: string | null
    }[]>`
      SELECT
        c.id,
        c.domain,
        c.control_code AS "controlCode",
        c.control_statement AS statement,
        c.control_type AS "controlType",
        c.control_scope AS "controlScope",
        c.is_automated AS "isAutomated",
        STRING_AGG(ac.name, ', ' ORDER BY ac.name) AS "applicabilityCategories"
      FROM controls c
      LEFT JOIN control_applicability ca ON ca.control_id = c.id
      LEFT JOIN applicability_categories ac ON ac.id = ca.applicability_id
      WHERE c.framework_id = ${master.id}
      GROUP BY c.id, c.domain, c.control_code, c.control_statement, c.control_type, c.control_scope, c.is_automated
      ORDER BY c.domain ASC, c.control_code ASC
    `,
  ])

  // Get all mappings with overlap scores
  const mappingRows = await db<{
    sourceControlId: string
    frameworkId: string
    targetControlCode: string
    targetStatement: string
    overlapScore: number
    status: string
  }[]>`
    SELECT
      m.source_control_id AS "sourceControlId",
      tc.framework_id AS "frameworkId",
      tc.control_code AS "targetControlCode",
      tc.control_statement AS "targetStatement",
      m.overlap_score AS "overlapScore",
      m.status
    FROM framework_map_runs r
    JOIN framework_maps m ON m.map_run_id = r.id
    JOIN controls tc ON tc.id = m.target_control_id
    WHERE r.status = 'Completed'
      AND r.source_framework_id = ${master.id}
    ORDER BY m.overlap_score DESC
  `

  // Index mappings by source control and framework
  const mappingIndex = new Map<string, Map<string, FrameworkComparisonCell[]>>()

  for (const r of mappingRows) {
    let byFramework = mappingIndex.get(r.sourceControlId)
    if (!byFramework) {
      byFramework = new Map()
      mappingIndex.set(r.sourceControlId, byFramework)
    }
    let arr = byFramework.get(r.frameworkId)
    if (!arr) {
      arr = []
      byFramework.set(r.frameworkId, arr)
    }
    arr.push({
      targetControlCode: r.targetControlCode,
      targetStatement: r.targetStatement,
      overlapScore: r.overlapScore,
      status: r.status,
    })
  }

  const frameworkIds = frameworks.map(f => f.id)

  const rows: FrameworkComparisonRow[] = masterControls.map(c => {
    const byFramework = mappingIndex.get(c.id)
    const mappings: Record<string, FrameworkComparisonCell[]> = {}

    for (const fwId of frameworkIds) {
      const cells = byFramework?.get(fwId)
      if (cells && cells.length > 0) mappings[fwId] = cells
    }

    return {
      controlId: c.id,
      domain: c.domain,
      controlCode: c.controlCode,
      statement: c.statement,
      controlType: c.controlType,
      controlScope: c.controlScope,
      isAutomated: c.isAutomated,
      applicabilityCategories: c.applicabilityCategories 
        ? c.applicabilityCategories.split(', ')
        : [],
      mappings,
    }
  })

  return {
    masterFramework: master,
    domains: domains.map(d => d.domain),
    frameworks,
    rows,
  }
}

/* =========================
   Unmapped Controls
========================= */

export async function getUnmappedControlsData(
  requestedFrameworkId: string | null
): Promise<UnmappedControlsData> {
  const masterResult = await db<{ id: string; name: string }[]>`
    SELECT id, name
    FROM frameworks
    WHERE is_master = true
    LIMIT 1
  `
  const master = masterResult[0] || null

  if (!master) {
    return {
      masterFramework: null,
      frameworks: [],
      activeFramework: null,
      rows: [],
    }
  }

  // Get frameworks with completed mapping runs
  const candidateFrameworks = await db<{ id: string; name: string }[]>`
    SELECT DISTINCT
      f.id,
      f.name
    FROM framework_map_runs r
    JOIN frameworks f ON f.id = r.target_framework_id
    WHERE r.status = 'Completed'
      AND r.source_framework_id = ${master.id}
      AND f.is_master = false
    ORDER BY f.name ASC
  `

  if (candidateFrameworks.length === 0) {
    return {
      masterFramework: master,
      frameworks: [],
      activeFramework: null,
      rows: [],
    }
  }

  // Get unmapped counts per target framework
  const counts = await db<{
    frameworkId: string
    unmappedCount: string
  }[]>`
    SELECT
      c.framework_id AS "frameworkId",
      COUNT(*) AS "unmappedCount"
    FROM controls c
    WHERE c.framework_id IN (
      SELECT DISTINCT r.target_framework_id
      FROM framework_map_runs r
      WHERE r.status = 'Completed'
        AND r.source_framework_id = ${master.id}
    )
    AND NOT EXISTS (
      SELECT 1
      FROM framework_map_runs r2
      JOIN framework_maps m2 ON m2.map_run_id = r2.id
      WHERE r2.status = 'Completed'
        AND r2.source_framework_id = ${master.id}
        AND r2.target_framework_id = c.framework_id
        AND m2.target_control_id = c.id
    )
    GROUP BY c.framework_id
  `

  const countMap = new Map(
    counts.map(r => [r.frameworkId, Number(r.unmappedCount)])
  )

  const frameworks: UnmappedFrameworkSummary[] = candidateFrameworks.map(f => ({
    id: f.id,
    name: f.name,
    unmappedCount: countMap.get(f.id) ?? 0,
  }))

  const active =
    (requestedFrameworkId &&
      frameworks.find(f => f.id === requestedFrameworkId)) ||
    frameworks[0]

  if (!active) {
    return {
      masterFramework: master,
      frameworks,
      activeFramework: null,
      rows: [],
    }
  }

  // Get unmapped controls with applicability for selected framework
  const rows = await db<{
    id: string
    domain: string
    subDomain: string | null
    controlCode: string
    statement: string
    controlType: string | null
    controlScope: string | null
    isAutomated: boolean | null
    applicabilityCategories: string | null
  }[]>`
    SELECT
      c.id,
      c.domain,
      c.sub_domain AS "subDomain",
      c.control_code AS "controlCode",
      c.control_statement AS statement,
      c.control_type AS "controlType",
      c.control_scope AS "controlScope",
      c.is_automated AS "isAutomated",
      STRING_AGG(ac.name, ', ' ORDER BY ac.name) AS "applicabilityCategories"
    FROM controls c
    LEFT JOIN control_applicability ca ON ca.control_id = c.id
    LEFT JOIN applicability_categories ac ON ac.id = ca.applicability_id
    WHERE c.framework_id = ${active.id}
      AND NOT EXISTS (
        SELECT 1
        FROM framework_map_runs r
        JOIN framework_maps m ON m.map_run_id = r.id
        WHERE r.status = 'Completed'
          AND r.source_framework_id = ${master.id}
          AND r.target_framework_id = ${active.id}
          AND m.target_control_id = c.id
      )
    GROUP BY c.id, c.domain, c.sub_domain, c.control_code, c.control_statement, c.control_type, c.control_scope, c.is_automated
    ORDER BY c.domain ASC, c.control_code ASC
    LIMIT 1000
  `

  return {
    masterFramework: master,
    frameworks,
    activeFramework: { id: active.id, name: active.name },
    rows: rows.map(r => ({
      ...r,
      applicabilityCategories: r.applicabilityCategories
        ? r.applicabilityCategories.split(', ')
        : [],
    })),
  }
}

/* =========================
   Framework Details (for modal)
========================= */

export type FrameworkDetailsControl = {
  id: string
  controlCode: string
  domain: string
  subDomain: string | null
  statement: string
  testingProcedure: string | null
  controlType: string | null
  controlScope: string | null
  isAutomated: boolean | null
  applicabilityIds: string[]
}

export type FrameworkDetails = {
  id: string
  name: string
  version: string | null
  isMaster: boolean
  totalControls: number
  controls: FrameworkDetailsControl[]
  availableApplicabilities: {
    id: string
    code: string
    name: string
    description: string | null
  }[]
}

export async function getFrameworkDetails(
  frameworkId: string
): Promise<FrameworkDetails | null> {
  const [frameworkResult, controlsResult, applicabilitiesResult] = await Promise.all([
    db<{
      id: string
      name: string
      version: string | null
      is_master: boolean
    }[]>`
      SELECT id, name, version, is_master
      FROM frameworks
      WHERE id = ${frameworkId}
      LIMIT 1
    `,
    db<{
      id: string
      controlCode: string
      domain: string
      subDomain: string | null
      statement: string
      testingProcedure: string | null
      controlType: string | null
      controlScope: string | null
      isAutomated: boolean | null
      applicabilityIds: string | null
    }[]>`
      SELECT
        c.id,
        c.control_code AS "controlCode",
        c.domain,
        c.sub_domain AS "subDomain",
        c.control_statement AS statement,
        c.testing_procedure AS "testingProcedure",
        c.control_type AS "controlType",
        c.control_scope AS "controlScope",
        c.is_automated AS "isAutomated",
        STRING_AGG(ca.applicability_id, ',' ORDER BY ca.applicability_id) AS "applicabilityIds"
      FROM controls c
      LEFT JOIN control_applicability ca ON ca.control_id = c.id
      WHERE c.framework_id = ${frameworkId}
      GROUP BY c.id, c.control_code, c.domain, c.sub_domain, c.control_statement, c.testing_procedure, c.control_type, c.control_scope, c.is_automated
      ORDER BY c.domain ASC, c.control_code ASC
    `,
    db<{
      id: string
      code: string
      name: string
      description: string | null
    }[]>`
      SELECT id, code, name, description
      FROM applicability_categories
      ORDER BY name ASC
    `,
  ])

  const framework = frameworkResult[0]
  if (!framework) return null

  return {
    id: framework.id,
    name: framework.name,
    version: framework.version,
    isMaster: framework.is_master,
    totalControls: controlsResult.length,
    controls: controlsResult.map(c => ({
      ...c,
      applicabilityIds: c.applicabilityIds ? c.applicabilityIds.split(',') : [],
    })),
    availableApplicabilities: applicabilitiesResult,
  }
}