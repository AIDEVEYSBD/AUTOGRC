import "server-only"
import { db } from "@/lib/db"

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */

export type ApplicationStatus = "Compliant" | "Warning" | "Critical"

export type ApplicationRow = {
  id: string
  name: string

  // Primary access
  primaryUrl: string
  primaryFqdn: string

  // Ownership
  serviceOwner: string
  businessOwner: string
  serviceDirector: string | null
  serviceVp: string | null

  // Classification
  informationClassification: string | null
  criticality: "C1" | "C2" | "C3" | "C4"
  drLevel: number // 1-5

  // Lifecycle
  lifecycleStatus: "Active" | "Deprecated" | "Decommissioned"
  endOfLifeDate: string | null

  // Operating model
  serviceManagement:
    | "Vendor Managed Cloud"
    | "Org-Managed Cloud"
    | "Hybrid"
    | "On-Premise"
    | "SaaS"
  cloudProvider: string | null

  // Applicability
  applicabilityCategories: string[]

  // Computed metrics
  status: ApplicationStatus
  score: number
  nonCompliances: number
  lastAssessedAt: string | null
}

export type ApplicationsKPIs = {
  totalApplications: number
  compliant: number
  warning: number
  critical: number
  avgScore: number
}

export type ApplicationsOverview = {
  kpis: ApplicationsKPIs
  rows: ApplicationRow[]
}

export type ApplicationApplicability = {
  id: string
  code: string
  name: string
  description: string | null
}

/* ─────────────────────────────────────────────
   Main Query (Assessment-based)
───────────────────────────────────────────── */

export async function getApplicationsOverview(): Promise<ApplicationsOverview> {
  /**
   * Ground truth:
   * - control_assessments (final_score, final_status)
   * - applications (all new fields)
   * - application_applicability + applicability_categories
   */

  const rowsRaw = await db<
    Array<
      Omit<ApplicationRow, "status" | "score" | "nonCompliances" | "applicabilityCategories"> & {
        score: string | null
        nonCompliances: string
        applicabilityCategories: string | null
      }
    >
  >`
    SELECT
      a.id,
      a.name,
      a.primary_url AS "primaryUrl",
      a.primary_fqdn AS "primaryFqdn",
      
      a.service_owner AS "serviceOwner",
      a.business_owner AS "businessOwner",
      a.service_director AS "serviceDirector",
      a.service_vp AS "serviceVp",
      
      a.information_classification AS "informationClassification",
      a.criticality,
      a.dr_level AS "drLevel",
      
      a.lifecycle_status AS "lifecycleStatus",
      a.end_of_life_date AS "endOfLifeDate",
      
      a.service_management AS "serviceManagement",
      a.cloud_provider AS "cloudProvider",
      
      AVG(ca.final_score) AS score,
      COUNT(*) FILTER (
        WHERE ca.final_status IN ('Not Compliant', 'Partial Gap')
      ) AS "nonCompliances",
      MAX(ca.assessed_at) AS "lastAssessedAt",
      
      STRING_AGG(DISTINCT ac.name, ', ' ORDER BY ac.name) AS "applicabilityCategories"
      
    FROM applications a
    LEFT JOIN control_assessments ca ON ca.application_id = a.id
    LEFT JOIN application_applicability aa ON aa.application_id = a.id
    LEFT JOIN applicability_categories ac ON ac.id = aa.applicability_id
    
    GROUP BY 
      a.id, a.name, a.primary_url, a.primary_fqdn,
      a.service_owner, a.business_owner, a.service_director, a.service_vp,
      a.information_classification, a.criticality, a.dr_level,
      a.lifecycle_status, a.end_of_life_date,
      a.service_management, a.cloud_provider
    ORDER BY a.name
  `

  /* ─────────────────────────────────────────────
     Derive status + KPIs
  ───────────────────────────────────────────── */

  let compliant = 0
  let warning = 0
  let critical = 0
  let scoreSum = 0
  let scoredApps = 0

  const rows: ApplicationRow[] = rowsRaw.map(r => {
    const score = r.score !== null ? Math.round(Number(r.score)) : 0

    let status: ApplicationStatus
    if (score >= 80) {
      status = "Compliant"
      compliant++
    } else if (score >= 50) {
      status = "Warning"
      warning++
    } else {
      status = "Critical"
      critical++
    }

    if (r.score !== null) {
      scoreSum += score
      scoredApps++
    }

    return {
      ...r,
      score,
      status,
      nonCompliances: Number(r.nonCompliances),
      applicabilityCategories: r.applicabilityCategories
        ? r.applicabilityCategories.split(", ")
        : [],
    }
  })

  const totalApplications = rows.length
  const avgScore = scoredApps > 0 ? Math.round(scoreSum / scoredApps) : 0

  return {
    kpis: {
      totalApplications,
      compliant,
      warning,
      critical,
      avgScore,
    },
    rows,
  }
}

/* ─────────────────────────────────────────────
   Applicability Query
───────────────────────────────────────────── */

export async function getApplicationApplicabilities(
  applicationId: string
): Promise<ApplicationApplicability[]> {
  const result = await db<ApplicationApplicability[]>`
    SELECT 
      ac.id,
      ac.code,
      ac.name,
      ac.description
    FROM application_applicability aa
    JOIN applicability_categories ac ON ac.id = aa.applicability_id
    WHERE aa.application_id = ${applicationId}
    ORDER BY ac.name
  `

  return result
}

/* ─────────────────────────────────────────────
   Get All Applicability Categories
───────────────────────────────────────────── */

export async function getAllApplicabilityCategories(): Promise<
  ApplicationApplicability[]
> {
  const result = await db<ApplicationApplicability[]>`
    SELECT 
      id,
      code,
      name,
      description
    FROM applicability_categories
    ORDER BY name
  `

  return result
}