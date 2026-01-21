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
  id: string

  controlId: string
  controlCode: string
  domain: string
  subDomain: string | null
  controlStatement: string
  testingProcedure: string | null

  status: "Compliant" | "Not Compliant" | "Partial Gap" | "Not Applicable"
  complianceScore: number

  assessedBy: string
  assessedAt: string

  evidence: EvidenceRow[]
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
     Control assessments with evidence
  ──────────────── */

  const assessmentsResult = await db<
    Array<{
      id: string
      controlId: string
      controlCode: string
      domain: string
      subDomain: string | null
      controlStatement: string
      testingProcedure: string | null
      finalStatus: string
      finalScore: number
      usedEvidenceIds: unknown
      assessedAt: string
    }>
  >`
    SELECT
      ca.id,
      ca.control_id AS "controlId",

      c.control_code AS "controlCode",
      c.domain,
      c.sub_domain AS "subDomain",
      c.control_statement AS "controlStatement",
      c.testing_procedure AS "testingProcedure",

      ca.final_status AS "finalStatus",
      ca.final_score AS "finalScore",
      ca.used_evidence_ids AS "usedEvidenceIds",
      ca.assessed_at AS "assessedAt"

    FROM control_assessments ca
    JOIN controls c ON c.id = ca.control_id

    WHERE ca.application_id = ${normalizedId}

    ORDER BY c.domain, c.control_code
  `

  if (assessmentsResult.length === 0) {
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
      },
      controls: [],
    }
  }

  /* ────────────────
     Fetch all evidence for these assessments
  ──────────────── */

  const allEvidenceIds = new Set<string>()
  assessmentsResult.forEach(a => {
    const ids = parseEvidenceIds(a.usedEvidenceIds)
    ids.forEach(id => allEvidenceIds.add(id))
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
  let scoreSum = 0

  const controls: ControlAssessmentRow[] = assessmentsResult.map(a => {
    const score = Math.round(a.finalScore)
    scoreSum += score

    if (a.finalStatus === "Compliant") compliant++
    else if (a.finalStatus === "Partial Gap") partialGap++
    else if (a.finalStatus === "Not Compliant") notCompliant++
    else if (a.finalStatus === "Not Applicable") notApplicable++

    const evidenceIds = parseEvidenceIds(a.usedEvidenceIds)

    const evidence: EvidenceRow[] = evidenceIds
      .map(id => evidenceMap.get(id))
      .filter((e): e is EvidenceRow => e !== undefined)

    const assessedBy =
      evidence.length > 0 ? evidence.map(e => e.title).join(", ") : "Unknown"

    return {
      id: a.id,
      controlId: a.controlId,
      controlCode: a.controlCode,
      domain: a.domain,
      subDomain: a.subDomain,
      controlStatement: a.controlStatement,
      testingProcedure: a.testingProcedure,
      status: a.finalStatus as ControlAssessmentRow["status"],
      complianceScore: score,
      assessedBy,
      assessedAt: a.assessedAt,
      evidence,
    }
  })

  const total = controls.length
  const overallScore = total > 0 ? Math.round(scoreSum / total) : 0

  const status =
    overallScore >= 80 ? "Compliant" : overallScore >= 50 ? "Warning" : "Critical"

  const lastAssessedAt =
    controls.length > 0
      ? controls.reduce(
          (max, c) => (c.assessedAt > max ? c.assessedAt : max),
          controls[0].assessedAt
        )
      : null

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
    },
    controls,
  }
}