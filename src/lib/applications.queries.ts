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
  totalAvgScore: number
  byServiceManagement: {
    vendorManagedCloud: { count: number; avgScore: number }
    orgManagedCloud: { count: number; avgScore: number }
    hybrid: { count: number; avgScore: number }
    onPremise: { count: number; avgScore: number }
    saas: { count: number; avgScore: number }
  }
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
   * 
   * CORRECTED LOGIC:
   * - Score = average of all assessed control scores per application
   * - Non-compliances = controls with final_score <= 50
   * - Only count MASTER framework controls (not all assessments)
   */

  // First, get the master framework ID
  const masterFrameworkResult = await db<Array<{ masterFrameworkId: string }>>`
    SELECT f.id as "masterFrameworkId"
    FROM frameworks f
    WHERE f.is_master = true
    LIMIT 1
  `
  
  const masterFrameworkId = masterFrameworkResult[0]?.masterFrameworkId

  const rowsRaw = await db<
    Array<
      Omit<ApplicationRow, "status" | "score" | "nonCompliances" | "applicabilityCategories"> & {
        avgScore: number
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
      
      -- Average score of all assessed master framework controls
      COALESCE(
        ROUND(AVG(ca.final_score) FILTER (
          WHERE c.framework_id = ${masterFrameworkId}
        )::numeric, 1),
        0
      ) AS "avgScore",
      
      -- Count DISTINCT non-compliances (score <= 50)
      COUNT(DISTINCT ca.control_id) FILTER (
        WHERE ca.final_score <= 50
        AND c.framework_id = ${masterFrameworkId}
      ) AS "nonCompliances",
      
      MAX(ca.assessed_at) AS "lastAssessedAt",
      
      STRING_AGG(DISTINCT ac.name, ', ' ORDER BY ac.name) AS "applicabilityCategories"
      
    FROM applications a
    LEFT JOIN control_assessments ca ON ca.application_id = a.id
    LEFT JOIN controls c ON c.id = ca.control_id
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
     Derive status + KPIs by Service Management
  ───────────────────────────────────────────── */

  const serviceManagementStats: Record<string, { count: number; totalScore: number }> = {
    "Vendor Managed Cloud": { count: 0, totalScore: 0 },
    "Org-Managed Cloud": { count: 0, totalScore: 0 },
    "Hybrid": { count: 0, totalScore: 0 },
    "On-Premise": { count: 0, totalScore: 0 },
    "SaaS": { count: 0, totalScore: 0 },
  }

  let totalScore = 0

  const rows: ApplicationRow[] = rowsRaw.map(r => {
    // Score is the average of all assessed control scores
    const score = Math.round(Number(r.avgScore))

    let status: ApplicationStatus
    if (score >= 80) {
      status = "Compliant"
    } else if (score >= 50) {
      status = "Warning"
    } else {
      status = "Critical"
    }

    totalScore += score

    // Track by service management type
    if (serviceManagementStats[r.serviceManagement]) {
      serviceManagementStats[r.serviceManagement].count++
      serviceManagementStats[r.serviceManagement].totalScore += score
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
  const totalAvgScore = totalApplications > 0 ? Math.round(totalScore / totalApplications) : 0

  return {
    kpis: {
      totalApplications,
      totalAvgScore,
      byServiceManagement: {
        vendorManagedCloud: {
          count: serviceManagementStats["Vendor Managed Cloud"].count,
          avgScore: serviceManagementStats["Vendor Managed Cloud"].count > 0
            ? Math.round(serviceManagementStats["Vendor Managed Cloud"].totalScore / serviceManagementStats["Vendor Managed Cloud"].count)
            : 0,
        },
        orgManagedCloud: {
          count: serviceManagementStats["Org-Managed Cloud"].count,
          avgScore: serviceManagementStats["Org-Managed Cloud"].count > 0
            ? Math.round(serviceManagementStats["Org-Managed Cloud"].totalScore / serviceManagementStats["Org-Managed Cloud"].count)
            : 0,
        },
        hybrid: {
          count: serviceManagementStats["Hybrid"].count,
          avgScore: serviceManagementStats["Hybrid"].count > 0
            ? Math.round(serviceManagementStats["Hybrid"].totalScore / serviceManagementStats["Hybrid"].count)
            : 0,
        },
        onPremise: {
          count: serviceManagementStats["On-Premise"].count,
          avgScore: serviceManagementStats["On-Premise"].count > 0
            ? Math.round(serviceManagementStats["On-Premise"].totalScore / serviceManagementStats["On-Premise"].count)
            : 0,
        },
        saas: {
          count: serviceManagementStats["SaaS"].count,
          avgScore: serviceManagementStats["SaaS"].count > 0
            ? Math.round(serviceManagementStats["SaaS"].totalScore / serviceManagementStats["SaaS"].count)
            : 0,
        },
      },
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

/* ─────────────────────────────────────────────
   Compliance Trends (6 months)
───────────────────────────────────────────── */

export type ComplianceTrend = {
  month: string
  score: number
}

export async function getComplianceTrends(): Promise<ComplianceTrend[]> {
  /**
   * Returns compliance trends for the past 6 months
   * Current month uses real data from assessments
   * Previous 5 months use generated demo data (random variations)
   * 
   * Formula: average of all assessed control scores
   */

  // Get master framework ID
  const masterFrameworkResult = await db<Array<{ masterFrameworkId: string }>>`
    SELECT f.id as "masterFrameworkId"
    FROM frameworks f
    WHERE f.is_master = true
    LIMIT 1
  `
  
  const masterFrameworkId = masterFrameworkResult[0]?.masterFrameworkId

  if (!masterFrameworkId) {
    return []
  }

  // Get current month's actual compliance score (average of all control scores)
  const currentScoreResult = await db<Array<{ avgScore: number }>>`
    SELECT 
      COALESCE(ROUND(AVG(ca.final_score)::numeric, 1), 0) as "avgScore"
    FROM control_assessments ca
    JOIN controls c ON c.id = ca.control_id
    WHERE c.framework_id = ${masterFrameworkId}
  `

  const currentScore = Math.round(Number(currentScoreResult[0]?.avgScore || 0))

  // Generate past 5 months with demo data (random variations around current score)
  const months = []
  const now = new Date()
  
  // Generate past 5 months (demo data)
  for (let i = 5; i >= 1; i--) {
    const date = new Date(now)
    date.setMonth(date.getMonth() - i)
    const monthName = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    
    // Generate random score within ±15% of current score, bounded by 0-100
    const variation = Math.floor(Math.random() * 30) - 15 // -15 to +15
    const demoScore = Math.max(0, Math.min(100, currentScore + variation))
    
    months.push({
      month: monthName,
      score: demoScore,
    })
  }

  // Add current month with real data
  const currentMonth = now.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
  months.push({
    month: currentMonth,
    score: currentScore,
  })

  return months
}