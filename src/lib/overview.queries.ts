import "server-only"
import { db } from "@/lib/db"

/* =========================
   Types
========================= */

export type OverviewKPIs = {
  masterCoveragePercent: number
  applicationsCovered: number
  totalApplications: number
  failingMasterControls: number
  averageComplianceScore: number
  criticalApplicationsAtRisk: number
}

export type FrameworkRing = {
  id: string
  name: string
  percent: number
  fullOverlap: number
  partialOverlap: number
  total: number
}

export type ApplicationsMatrix = {
  frameworks: { id: string; name: string; is_master: boolean }[]
  rows: {
    id: string
    name: string
    owner: string
    overallScore: number
    byFramework: Record<
      string,
      { done: number; total: number; percent: number }
    >
  }[]
}

export type SecurityDomain = {
  id: string
  name: string
  controls: number
  avgCompliance: number
}

export type ComplianceApp = {
  id: string
  name: string
  owner: string
  percent: number
  criticality: string
}

export type ControlInDomain = {
  id: string
  controlCode: string
  controlStatement: string
  subDomain: string | null
  controlType: string | null
  isAutomated: boolean | null
  compliantApps: number
  nonCompliantApps: number
  avgScore: number
}

export type ApplicabilityMetric = {
  categoryId: string
  categoryName: string
  categoryCode: string
  applicationCount: number
  avgComplianceScore: number
  controlsCovered: number
  totalControls: number
}

/* =========================
   Public API
========================= */

export async function getMasterFrameworkId(): Promise<string | null> {
  const result = await db<{ id: string; name: string }[]>`
    SELECT id, name
    FROM frameworks
    WHERE is_master = true
    LIMIT 1
  `
  return result[0]?.id ?? null
}

export async function getMasterFrameworkName(masterFrameworkId: string): Promise<string> {
  const result = await db<{ name: string }[]>`
    SELECT name FROM frameworks WHERE id = ${masterFrameworkId} LIMIT 1
  `
  return result[0]?.name ?? "Unknown Framework"
}

/* ---------- KPIs ---------- */

export async function getOverviewKPIs(
  masterFrameworkId: string
): Promise<OverviewKPIs> {
  const [
    totalMasterResult,
    assessedMasterResult,
    failingMasterResult,
    totalAppsResult,
    appsCoveredResult,
    criticalAppsResult,
  ] = await Promise.all([
    // Total master controls
    db<{ c: string }[]>`
      SELECT COUNT(*) AS c
      FROM controls
      WHERE framework_id = ${masterFrameworkId}
    `,
    // Assessed master controls
    db<{ c: string }[]>`
      SELECT COUNT(DISTINCT control_id) AS c
      FROM control_assessments
      WHERE control_id IN (
        SELECT id FROM controls WHERE framework_id = ${masterFrameworkId}
      )
    `,
    // Failing master controls (score <= 50)
    db<{ c: string }[]>`
      SELECT COUNT(DISTINCT control_id) AS c
      FROM control_assessments
      WHERE control_id IN (
        SELECT id FROM controls WHERE framework_id = ${masterFrameworkId}
      )
      AND final_score <= 50
    `,
    // Total applications
    db<{ c: string }[]>`
      SELECT COUNT(*) AS c FROM applications
    `,
    // Apps with any assessment
    db<{ c: string }[]>`
      SELECT COUNT(DISTINCT application_id) AS c
      FROM control_assessments
    `,
    // Critical apps at risk (C1/C2 with score < 70)
    db<{ c: string }[]>`
      WITH master_controls AS (
        SELECT COUNT(*) as total
        FROM controls
        WHERE framework_id = ${masterFrameworkId}
      ),
      app_scores AS (
        SELECT 
          ca.application_id,
          a.criticality,
          COUNT(*) FILTER (WHERE ca.final_score > 80) as compliant_controls
        FROM control_assessments ca
        JOIN applications a ON a.id = ca.application_id
        JOIN controls c ON c.id = ca.control_id
        WHERE c.framework_id = ${masterFrameworkId}
          AND a.criticality IN ('C1', 'C2')
        GROUP BY ca.application_id, a.criticality
      )
      SELECT COUNT(*) as c
      FROM app_scores, master_controls
      WHERE (compliant_controls * 100.0 / master_controls.total) < 70
    `,
  ])

  const totalMaster = Number(totalMasterResult[0]?.c ?? 0)
  const assessedMaster = Number(assessedMasterResult[0]?.c ?? 0)
  const masterCoveragePercent =
    totalMaster > 0 ? Math.round((assessedMaster / totalMaster) * 100) : 0

  // Calculate average compliance score across all apps
  // Score = (compliant controls per app / total master controls) * 100
  const avgScoreResult = await db<{ avg_score: number }[]>`
    WITH master_controls AS (
      SELECT COUNT(*) as total
      FROM controls
      WHERE framework_id = ${masterFrameworkId}
    ),
    app_scores AS (
      SELECT 
        ca.application_id,
        COUNT(*) FILTER (WHERE ca.final_score > 80) as compliant_controls
      FROM control_assessments ca
      JOIN controls c ON c.id = ca.control_id
      WHERE c.framework_id = ${masterFrameworkId}
      GROUP BY ca.application_id
    )
    SELECT COALESCE(
      AVG(compliant_controls * 100.0 / NULLIF(master_controls.total, 0)),
      0
    ) as avg_score
    FROM app_scores, master_controls
    WHERE master_controls.total > 0
  `

  return {
    masterCoveragePercent,
    applicationsCovered: Number(appsCoveredResult[0]?.c ?? 0),
    totalApplications: Number(totalAppsResult[0]?.c ?? 0),
    failingMasterControls: Number(failingMasterResult[0]?.c ?? 0),
    averageComplianceScore: Math.round(avgScoreResult[0]?.avg_score ?? 0),
    criticalApplicationsAtRisk: Number(criticalAppsResult[0]?.c ?? 0),
  }
}

/* ---------- Framework Rings ---------- */

export async function getFrameworkRings(
  masterFrameworkId: string
): Promise<FrameworkRing[]> {
  const frameworks = await db<{ id: string; name: string }[]>`
    SELECT id, name
    FROM frameworks
    WHERE is_master = false
    ORDER BY name ASC
  `

  const rings = await Promise.all(
    frameworks.map(async (fw) => {
      const [totalResult, runResult] = await Promise.all([
        db<{ c: string }[]>`
          SELECT COUNT(*) AS c
          FROM controls
          WHERE framework_id = ${fw.id}
        `,
        db<{ id: string }[]>`
          SELECT id
          FROM framework_map_runs
          WHERE status = 'Completed'
            AND (
              (source_framework_id = ${fw.id} AND target_framework_id = ${masterFrameworkId})
              OR
              (source_framework_id = ${masterFrameworkId} AND target_framework_id = ${fw.id})
            )
          ORDER BY completed_at DESC
          LIMIT 1
        `,
      ])

      const total = Number(totalResult[0]?.c ?? 0)
      let full = 0
      let partial = 0

      if (runResult[0]) {
        const overlapResult = await db<{ full_overlap: string; partial_overlap: string }[]>`
          SELECT
            COUNT(*) FILTER (WHERE status = 'Full Overlap') AS full_overlap,
            COUNT(*) FILTER (WHERE status = 'Partial Overlap') AS partial_overlap
          FROM framework_maps
          WHERE map_run_id = ${runResult[0].id}
        `

        full = Number(overlapResult[0]?.full_overlap ?? 0)
        partial = Number(overlapResult[0]?.partial_overlap ?? 0)
      }

      const weighted = full + partial * 0.5
      const percent = total > 0 ? Math.round((weighted / total) * 100) : 0

      return {
        id: fw.id,
        name: fw.name,
        percent,
        fullOverlap: full,
        partialOverlap: partial,
        total,
      }
    })
  )

  return rings
}

/* ---------- Applications Matrix ---------- */

export async function getApplicationsMatrix(
  masterFrameworkId: string
): Promise<ApplicationsMatrix> {
  // Get total master controls once
  const totalMasterControlsResult = await db<{ c: string }[]>`
    SELECT COUNT(*) AS c
    FROM controls
    WHERE framework_id = ${masterFrameworkId}
  `
  const totalMasterControls = Number(totalMasterControlsResult[0]?.c ?? 0)

  // Get all frameworks INCLUDING the master framework
  const allFrameworks = await db<{ id: string; name: string; is_master: boolean }[]>`
    SELECT id, name, is_master
    FROM frameworks
    ORDER BY 
      CASE WHEN is_master THEN 0 ELSE 1 END,
      name ASC
  `

  const apps = await db<{ id: string; name: string; owner: string; criticality: string }[]>`
    SELECT 
      id, 
      name, 
      service_owner AS owner,
      criticality
    FROM applications
    ORDER BY name ASC
  `

  const rows = await Promise.all(
    apps.map(async (app) => {
      const byFramework: Record<
        string,
        { done: number; total: number; percent: number }
      > = {}

      let sum = 0
      let count = 0

      for (const fw of allFrameworks) {
        // Get total controls in this framework
        const totalResult = await db<{ c: string }[]>`
          SELECT COUNT(*) AS c
          FROM controls
          WHERE framework_id = ${fw.id}
        `
        const totalControlsInFramework = Number(totalResult[0]?.c ?? 0)

        let assessed = 0
        let compliantControls = 0
        let score = 0

        if (fw.is_master) {
          // For MASTER framework: Direct compliance from assessments
          const statsResult = await db<{
            assessed: string
            compliant_controls: string
          }[]>`
            SELECT 
              COUNT(DISTINCT ca.control_id) as assessed,
              COUNT(*) FILTER (WHERE ca.final_score > 80) as compliant_controls
            FROM control_assessments ca
            JOIN controls c ON c.id = ca.control_id
            WHERE ca.application_id = ${app.id}
              AND c.framework_id = ${fw.id}
          `

          assessed = Number(statsResult[0]?.assessed ?? 0)
          compliantControls = Number(statsResult[0]?.compliant_controls ?? 0)
          
          // Score = (compliant controls / total controls in master) * 100
          score = totalControlsInFramework > 0 
            ? Math.round((compliantControls / totalControlsInFramework) * 100)
            : 0
        } else {
          // For OTHER frameworks: Map compliance through framework mappings
          const runResult = await db<{ id: string }[]>`
            SELECT id
            FROM framework_map_runs
            WHERE status = 'Completed'
              AND (
                (source_framework_id = ${fw.id} AND target_framework_id = ${masterFrameworkId})
                OR
                (source_framework_id = ${masterFrameworkId} AND target_framework_id = ${fw.id})
              )
            ORDER BY completed_at DESC
            LIMIT 1
          `

          if (runResult[0]) {
            // For each control in THIS framework, check if its mapped master controls are compliant
            // A control is compliant if ANY of its mapped master controls have score > 80
            const propagatedResult = await db<{
              total_fw_controls: string
              compliant_fw_controls: string
            }[]>`
              WITH fw_controls AS (
                -- All controls in this framework
                SELECT id as control_id
                FROM controls
                WHERE framework_id = ${fw.id}
              ),
              fw_control_mappings AS (
                -- Map each framework control to its master control(s)
                SELECT DISTINCT
                  CASE
                    WHEN r.source_framework_id = ${fw.id} THEN fm.source_control_id
                    ELSE fm.target_control_id
                  END AS fw_control_id,
                  CASE
                    WHEN r.source_framework_id = ${fw.id} THEN fm.target_control_id
                    ELSE fm.source_control_id
                  END AS master_control_id,
                  fm.overlap_score
                FROM framework_maps fm
                JOIN framework_map_runs r ON r.id = fm.map_run_id
                WHERE fm.map_run_id = ${runResult[0].id}
              ),
              control_compliance AS (
                -- For each framework control, check if mapped master controls are compliant
                SELECT 
                  fc.control_id as fw_control_id,
                  BOOL_OR(ca.final_score > 80) as is_compliant,
                  COUNT(ca.id) > 0 as has_assessment
                FROM fw_controls fc
                LEFT JOIN fw_control_mappings fcm ON fcm.fw_control_id = fc.control_id
                LEFT JOIN control_assessments ca 
                  ON ca.control_id = fcm.master_control_id
                  AND ca.application_id = ${app.id}
                GROUP BY fc.control_id
              )
              SELECT 
                COUNT(*) as total_fw_controls,
                COUNT(*) FILTER (WHERE is_compliant = true) as compliant_fw_controls
              FROM control_compliance
            `

            const totalFwControls = Number(propagatedResult[0]?.total_fw_controls ?? 0)
            compliantControls = Number(propagatedResult[0]?.compliant_fw_controls ?? 0)
            assessed = compliantControls // For display purposes
            
            // Score = (compliant controls / total controls in this framework) * 100
            score = totalFwControls > 0 
              ? Math.round((compliantControls / totalFwControls) * 100)
              : 0
          }
        }

        byFramework[fw.id] = {
          done: assessed,
          total: totalControlsInFramework,
          percent: score,
        }

        sum += score
        count++
      }

      const overallScore = count > 0 ? Math.round(sum / count) : 0

      return {
        id: app.id,
        name: app.name,
        owner: app.owner,
        overallScore,
        byFramework,
      }
    })
  )

  return { frameworks: allFrameworks, rows }
}

/* ---------- Domain Compliance ---------- */

export async function getSecurityDomains(
  masterFrameworkId: string
): Promise<SecurityDomain[]> {
  // Get total master controls
  const totalMasterControlsResult = await db<{ c: string }[]>`
    SELECT COUNT(*) AS c
    FROM controls
    WHERE framework_id = ${masterFrameworkId}
  `
  const totalMasterControls = Number(totalMasterControlsResult[0]?.c ?? 0)

  const domains = await db<{
    domain: string
    controls: string
    avg_compliance: number
  }[]>`
    WITH domain_stats AS (
      SELECT 
        COALESCE(c.domain, 'Other') as domain,
        COUNT(*) as controls,
        AVG(
          (
            SELECT 
              CASE 
                WHEN COUNT(*) FILTER (WHERE ca.final_score > 80) > 0 AND ${totalMasterControls} > 0
                THEN (COUNT(*) FILTER (WHERE ca.final_score > 80) * 100.0 / ${totalMasterControls})
                ELSE 0
              END
            FROM control_assessments ca
            WHERE ca.control_id = c.id
          )
        ) as avg_compliance
      FROM controls c
      WHERE c.framework_id = ${masterFrameworkId}
      GROUP BY c.domain
    )
    SELECT 
      domain,
      controls,
      COALESCE(ROUND(avg_compliance::numeric, 1), 0) as avg_compliance
    FROM domain_stats
    ORDER BY 
      CASE domain
        WHEN 'Respond' THEN 1
        WHEN 'Identify' THEN 2
        WHEN 'Detect' THEN 3
        WHEN 'Protect' THEN 4
        WHEN 'Govern' THEN 5
        WHEN 'Recover' THEN 6
        ELSE 7
      END
  `

  return domains.map((d, index) => ({
    id: `domain-${index}`,
    name: d.domain,
    controls: Number(d.controls),
    avgCompliance: Number(d.avg_compliance),
  }))
}

export async function getNonCompliantApplications(): Promise<ComplianceApp[]> {
  // Get total master controls
  const masterFrameworkId = await getMasterFrameworkId()
  if (!masterFrameworkId) return []

  const totalMasterControlsResult = await db<{ c: string }[]>`
    SELECT COUNT(*) AS c
    FROM controls c
    JOIN frameworks f ON f.id = c.framework_id
    WHERE f.is_master = true
  `
  const totalMasterControls = Number(totalMasterControlsResult[0]?.c ?? 0)

  const apps = await db<{
    id: string
    name: string
    owner: string
    criticality: string
    percent: number
  }[]>`
    WITH app_compliance AS (
      SELECT 
        a.id,
        a.name,
        a.service_owner as owner,
        a.criticality,
        CASE 
          WHEN ${totalMasterControls} > 0 THEN
            ROUND(
              (COUNT(*) FILTER (WHERE ca.final_score > 80) * 100.0 / ${totalMasterControls})::numeric,
              1
            )
          ELSE 0
        END as percent
      FROM applications a
      LEFT JOIN control_assessments ca ON ca.application_id = a.id
      GROUP BY a.id, a.name, a.service_owner, a.criticality
    )
    SELECT 
      id,
      name,
      owner,
      criticality,
      percent
    FROM app_compliance
    WHERE percent < 70
    ORDER BY 
      CASE criticality
        WHEN 'C1' THEN 1
        WHEN 'C2' THEN 2
        WHEN 'C3' THEN 3
        WHEN 'C4' THEN 4
        ELSE 5
      END,
      percent ASC,
      name ASC
  `

  return apps.map((app) => ({
    ...app,
    percent: Number(app.percent),
  }))
}

export async function getCompliantApplications(): Promise<ComplianceApp[]> {
  // Get total master controls
  const masterFrameworkId = await getMasterFrameworkId()
  if (!masterFrameworkId) return []

  const totalMasterControlsResult = await db<{ c: string }[]>`
    SELECT COUNT(*) AS c
    FROM controls c
    JOIN frameworks f ON f.id = c.framework_id
    WHERE f.is_master = true
  `
  const totalMasterControls = Number(totalMasterControlsResult[0]?.c ?? 0)

  const apps = await db<{
    id: string
    name: string
    owner: string
    criticality: string
    percent: number
  }[]>`
    WITH app_compliance AS (
      SELECT 
        a.id,
        a.name,
        a.service_owner as owner,
        a.criticality,
        CASE 
          WHEN ${totalMasterControls} > 0 THEN
            ROUND(
              (COUNT(*) FILTER (WHERE ca.final_score > 80) * 100.0 / ${totalMasterControls})::numeric,
              1
            )
          ELSE 0
        END as percent
      FROM applications a
      LEFT JOIN control_assessments ca ON ca.application_id = a.id
      GROUP BY a.id, a.name, a.service_owner, a.criticality
    )
    SELECT 
      id,
      name,
      owner,
      criticality,
      percent
    FROM app_compliance
    WHERE percent >= 70
    ORDER BY percent DESC, name ASC
  `

  return apps.map((app) => ({
    ...app,
    percent: Number(app.percent),
  }))
}

export async function getControlsByDomain(
  masterFrameworkId: string,
  domainName: string
): Promise<ControlInDomain[]> {
  const controls = await db<{
    id: string
    controlCode: string
    controlStatement: string
    subDomain: string | null
    controlType: string | null
    isAutomated: boolean | null
    compliantApps: string
    nonCompliantApps: string
    avgScore: number
  }[]>`
    SELECT 
      c.id,
      c.control_code as "controlCode",
      c.control_statement as "controlStatement",
      c.sub_domain as "subDomain",
      c.control_type as "controlType",
      c.is_automated as "isAutomated",
      COUNT(DISTINCT ca.application_id) FILTER (
        WHERE ca.final_score > 80
      ) as "compliantApps",
      COUNT(DISTINCT ca.application_id) FILTER (
        WHERE ca.final_score <= 50
      ) as "nonCompliantApps",
      COALESCE(
        ROUND(AVG(ca.final_score)::numeric, 1),
        0
      ) as "avgScore"
    FROM controls c
    LEFT JOIN control_assessments ca ON ca.control_id = c.id
    WHERE c.framework_id = ${masterFrameworkId}
      AND c.domain = ${domainName}
    GROUP BY c.id, c.control_code, c.control_statement, c.sub_domain, c.control_type, c.is_automated
    ORDER BY c.control_code ASC
  `

  return controls.map((ctrl) => ({
    ...ctrl,
    compliantApps: Number(ctrl.compliantApps),
    nonCompliantApps: Number(ctrl.nonCompliantApps),
    avgScore: Number(ctrl.avgScore),
  }))
}

/* ---------- Applicability Metrics (NEW) ---------- */

export async function getApplicabilityMetrics(
  masterFrameworkId: string
): Promise<ApplicabilityMetric[]> {
  // Get total master controls
  const totalMasterControlsResult = await db<{ c: string }[]>`
    SELECT COUNT(*) AS c
    FROM controls
    WHERE framework_id = ${masterFrameworkId}
  `
  const totalMasterControls = Number(totalMasterControlsResult[0]?.c ?? 0)

  const metrics = await db<{
    categoryId: string
    categoryName: string
    categoryCode: string
    applicationCount: string
    avgComplianceScore: number
    controlsCovered: string
    totalControls: string
  }[]>`
    WITH category_apps AS (
      SELECT 
        ac.id as category_id,
        ac.name as category_name,
        ac.code as category_code,
        COUNT(DISTINCT aa.application_id) as application_count,
        CASE 
          WHEN ${totalMasterControls} > 0 THEN
            COALESCE(
              ROUND(
                AVG(
                  (SELECT COUNT(*) FILTER (WHERE ca2.final_score > 80)
                   FROM control_assessments ca2
                   WHERE ca2.application_id = aa.application_id)
                * 100.0 / ${totalMasterControls}
                )::numeric,
                1
              ),
              0
            )
          ELSE 0
        END as avg_compliance_score
      FROM applicability_categories ac
      LEFT JOIN application_applicability aa ON aa.applicability_id = ac.id
      GROUP BY ac.id, ac.name, ac.code
    ),
    category_controls AS (
      SELECT 
        ac.id as category_id,
        COUNT(DISTINCT CASE 
          WHEN ca.control_id IS NOT NULL THEN ca.control_id 
        END) as controls_covered,
        ${totalMasterControls} as total_controls
      FROM applicability_categories ac
      LEFT JOIN application_applicability aa ON aa.applicability_id = ac.id
      LEFT JOIN control_assessments ca ON ca.application_id = aa.application_id
      WHERE ca.control_id IN (SELECT id FROM controls WHERE framework_id = ${masterFrameworkId})
         OR ca.control_id IS NULL
      GROUP BY ac.id
    )
    SELECT 
      ca.category_id as "categoryId",
      ca.category_name as "categoryName",
      ca.category_code as "categoryCode",
      ca.application_count as "applicationCount",
      ca.avg_compliance_score as "avgComplianceScore",
      COALESCE(cc.controls_covered, 0) as "controlsCovered",
      COALESCE(cc.total_controls, 0) as "totalControls"
    FROM category_apps ca
    LEFT JOIN category_controls cc ON cc.category_id = ca.category_id
    ORDER BY ca.category_name ASC
  `

  return metrics.map((metric) => ({
    ...metric,
    applicationCount: Number(metric.applicationCount),
    avgComplianceScore: Number(metric.avgComplianceScore),
    controlsCovered: Number(metric.controlsCovered),
    totalControls: Number(metric.totalControls),
  }))
}