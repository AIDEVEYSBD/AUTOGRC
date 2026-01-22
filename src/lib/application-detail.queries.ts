import "server-only"
import { db } from "@/lib/db"

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */

export type EvidenceRow = {
  id: string
  sourceType: "Automation" | "SOC Report" | "Manual Testing"
  automationRunId: string | null
  socRunId: string | null
  status: "Compliant" | "Not Compliant" | "Partial Gap" | "Not Applicable"
  score: number
  title: string
  explanation: string | null
  evidenceData: string | null
  collectedAt: string
  createdAt: string
}

export type ControlAssessmentRow = {
  id: string | null // null for unassessed controls

  controlId: string
  controlCode: string
  domain: string
  subDomain: string | null
  controlStatement: string
  testingProcedure: string | null

  status: "Compliant" | "Not Compliant" | "Partial Gap" | "Not Applicable" | "Not Assessed"
  complianceScore: number

  assessedBy: string | null
  assessedAt: string | null

  evidence: EvidenceRow[]
  isAssessed: boolean // Helper flag to distinguish assessed vs unassessed
}

export type ApplicationHeaderRow = {
  id: string

  name: string
  primaryUrl: string
  primaryFqdn: string
  endpoints: any | null

  serviceManagement:
    | "Vendor Managed Cloud"
    | "Org-Managed Cloud"
    | "Hybrid"
    | "On-Premise"
    | "SaaS"
  cloudProvider: string | null
  assets: any | null

  serviceOwner: string
  businessOwner: string
  serviceDirector: string | null
  serviceVp: string | null

  informationClassification:
    | "Public"
    | "Internal"
    | "Confidential"
    | "Personal Data"
    | "Restricted"
    | null

  criticality: "C1" | "C2" | "C3" | "C4"
  drLevel: number

  lifecycleStatus: "Active" | "Deprecated" | "Decommissioned"
  endOfLifeDate: string | null

  createdAt: string
}

export type ApplicationDetail = ApplicationHeaderRow & {
  overallScore: number
  status: "Compliant" | "Warning" | "Critical"
  lastAssessedAt: string | null

  summary: {
    total: number
    compliant: number
    partialGap: number
    notCompliant: number
    notApplicable: number
    notAssessed: number
  }

  controls: ControlAssessmentRow[]
}

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */

function parseEvidenceIds(value: unknown): string[] {
  if (!value) return []

  // If driver already gives JSON as an array
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string" && v.length > 0)
  }

  // If driver gives JSONB as a string
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        return parsed.filter((v): v is string => typeof v === "string" && v.length > 0)
      }
      return []
    } catch {
      return []
    }
  }

  // Rare: driver gives an object but not an array
  return []
}

/* ─────────────────────────────────────────────
   Query
───────────────────────────────────────────── */

export async function getApplicationDetail(
  applicationId: string
): Promise<ApplicationDetail | null> {
  const normalizedId = applicationId.trim()

  /* ────────────────
     Application header (FULL)
  ──────────────── */

  const appResult = await db<ApplicationHeaderRow[]>`
    SELECT
      id,
      name,
      primary_url AS "primaryUrl",
      primary_fqdn AS "primaryFqdn",
      endpoints,

      service_management AS "serviceManagement",
      cloud_provider AS "cloudProvider",
      assets,

      service_owner AS "serviceOwner",
      business_owner AS "businessOwner",
      service_director AS "serviceDirector",
      service_vp AS "serviceVp",

      information_classification AS "informationClassification",
      criticality,
      dr_level AS "drLevel",

      lifecycle_status AS "lifecycleStatus",
      end_of_life_date AS "endOfLifeDate",

      created_at AS "createdAt"
    FROM applications
    WHERE id = ${normalizedId}
  `

  const app = appResult[0]
  if (!app) return null

  /* ────────────────
     Get master framework ID
  ──────────────── */

  const masterFrameworkResult = await db<{ id: string }[]>`
    SELECT id
    FROM frameworks
    WHERE is_master = true
    LIMIT 1
  `

  const masterFrameworkId = masterFrameworkResult[0]?.id
  if (!masterFrameworkId) {
    return {
      ...app,
      overallScore: 0,
      status: "Critical",
      lastAssessedAt: null,
      summary: {
        total: 0,
        compliant: 0,
        partialGap: 0,
        notCompliant: 0,
        notApplicable: 0,
        notAssessed: 0,
      },
      controls: [],
    }
  }

  /* ────────────────
     Get ALL master framework controls (assessed + unassessed)
  ──────────────── */

  const controlsResult = await db<
    Array<{
      controlId: string
      controlCode: string
      domain: string
      subDomain: string | null
      controlStatement: string
      testingProcedure: string | null
      
      // Assessment fields (nullable for unassessed)
      assessmentId: string | null
      finalStatus: string | null
      finalScore: number | null
      usedEvidenceIds: unknown
      assessedAt: string | null
    }>
  >`
    SELECT
      c.id AS "controlId",
      c.control_code AS "controlCode",
      c.domain,
      c.sub_domain AS "subDomain",
      c.control_statement AS "controlStatement",
      c.testing_procedure AS "testingProcedure",

      ca.id AS "assessmentId",
      ca.final_status AS "finalStatus",
      ca.final_score AS "finalScore",
      ca.used_evidence_ids AS "usedEvidenceIds",
      ca.assessed_at AS "assessedAt"

    FROM controls c
    LEFT JOIN control_assessments ca 
      ON ca.control_id = c.id 
      AND ca.application_id = ${normalizedId}

    WHERE c.framework_id = ${masterFrameworkId}

    ORDER BY c.domain, c.control_code
  `

  if (controlsResult.length === 0) {
    return {
      ...app,
      overallScore: 0,
      status: "Critical",
      lastAssessedAt: null,
      summary: {
        total: 0,
        compliant: 0,
        partialGap: 0,
        notCompliant: 0,
        notApplicable: 0,
        notAssessed: 0,
      },
      controls: [],
    }
  }

  /* ────────────────
     Fetch all evidence for assessed controls
  ──────────────── */

  const allEvidenceIds = new Set<string>()
  controlsResult.forEach(c => {
    if (c.assessmentId) {
      const ids = parseEvidenceIds(c.usedEvidenceIds)
      ids.forEach(id => allEvidenceIds.add(id))
    }
  })

  const evidenceMap = new Map<string, EvidenceRow>()

  if (allEvidenceIds.size > 0) {
    const ids = Array.from(allEvidenceIds)

    const evidenceResult = await db<
      Array<{
        id: string
        sourceType: string
        automationRunId: string | null
        socRunId: string | null
        status: string
        score: number
        title: string
        explanation: string | null
        evidenceData: string | null
        collectedAt: string
        createdAt: string
      }>
    >`
      SELECT
        id,
        source_type AS "sourceType",
        automation_run_id AS "automationRunId",
        soc_run_id AS "socRunId",
        status,
        score,
        title,
        explanation,
        evidence_data AS "evidenceData",
        collected_at AS "collectedAt",
        created_at AS "createdAt"
      FROM assessment_evidence
      WHERE id = ANY(${ids}::text[])
    `

    evidenceResult.forEach(e => {
      evidenceMap.set(e.id, {
        ...e,
        sourceType: e.sourceType as EvidenceRow["sourceType"],
        status: e.status as EvidenceRow["status"],
        evidenceData: e.evidenceData,
      })
    })
  }

  /* ────────────────
     Normalize + rollups
  ──────────────── */

  let compliant = 0
  let partialGap = 0
  let notCompliant = 0
  let notApplicable = 0
  let notAssessed = 0
  let scoreSum = 0
  let assessedCount = 0

  const controls: ControlAssessmentRow[] = controlsResult.map(c => {
    const isAssessed = c.assessmentId !== null

    if (!isAssessed) {
      // Unassessed control
      notAssessed++
      return {
        id: null,
        controlId: c.controlId,
        controlCode: c.controlCode,
        domain: c.domain,
        subDomain: c.subDomain,
        controlStatement: c.controlStatement,
        testingProcedure: c.testingProcedure,
        status: "Not Assessed" as const,
        complianceScore: 0,
        assessedBy: null,
        assessedAt: null,
        evidence: [],
        isAssessed: false,
      }
    }

    // Assessed control
    const score = Math.round(c.finalScore ?? 0)
    scoreSum += score
    assessedCount++

    if (c.finalStatus === "Compliant") compliant++
    else if (c.finalStatus === "Partial Gap") partialGap++
    else if (c.finalStatus === "Not Compliant") notCompliant++
    else if (c.finalStatus === "Not Applicable") notApplicable++

    const evidenceIds = parseEvidenceIds(c.usedEvidenceIds)

    const evidence: EvidenceRow[] = evidenceIds
      .map(id => evidenceMap.get(id))
      .filter((e): e is EvidenceRow => e !== undefined)

    const assessedBy =
      evidence.length > 0 ? evidence.map(e => e.title).join(", ") : "Unknown"

    return {
      id: c.assessmentId,
      controlId: c.controlId,
      controlCode: c.controlCode,
      domain: c.domain,
      subDomain: c.subDomain,
      controlStatement: c.controlStatement,
      testingProcedure: c.testingProcedure,
      status: c.finalStatus as ControlAssessmentRow["status"],
      complianceScore: score,
      assessedBy,
      assessedAt: c.assessedAt,
      evidence,
      isAssessed: true,
    }
  })

  const total = controls.length
  const overallScore = assessedCount > 0 ? Math.round(scoreSum / assessedCount) : 0

  const status =
    overallScore >= 80 ? "Compliant" : overallScore >= 50 ? "Warning" : "Critical"

  const lastAssessedAt =
    controls
      .filter(c => c.assessedAt !== null)
      .reduce<string | null>(
        (max, c) => (!max || (c.assessedAt && c.assessedAt > max) ? c.assessedAt : max),
        null
      )

  return {
    ...app,
    overallScore,
    status,
    lastAssessedAt,
    summary: {
      total,
      compliant,
      partialGap,
      notCompliant,
      notApplicable,
      notAssessed,
    },
    controls,
  }
}