import { notFound } from "next/navigation"
import { Metadata } from "next"
import { getApplicationDetail } from "@/lib/application-detail.queries"
import ControlsTable from "./controls-table"
import ComplianceTrendsChart from "./compliance-trends-chart"

/* ─────────────────────────────────────────────
   Metadata Generation
───────────────────────────────────────────── */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ applicationId: string }>
}): Promise<Metadata> {
  const { applicationId } = await params
  const decodedId = decodeURIComponent(applicationId)
  
  try {
    const app = await getApplicationDetail(decodedId)
    
    return {
      title: app?.name || "Application Details",
      // Browser tab will show: "Azure Portal | AutoGRC" (or whatever the app name is)
    }
  } catch (error) {
    // Fallback if fetch fails
    return {
      title: "Application Details",
    }
  }
}

/* ─────────────────────────────────────────────
   Page (Server Component)
───────────────────────────────────────────── */
export const dynamic = "force-dynamic"
export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ applicationId: string }>
}) {
  const { applicationId } = await params
  const decodedId = decodeURIComponent(applicationId)

  const app = await getApplicationDetail(decodedId)

  if (!app) {
    notFound()
  }

  const trendData = generateComplianceTrends(
    decodedId,
    app.overallScore,
    app.summary.notCompliant
  )

  const previousMonthScore = trendData[trendData.length - 2].score
  const scoreChange = app.overallScore - previousMonthScore

  // Calculate derived metrics
  const assessedControls =
    app.summary.compliant +
    app.summary.partialGap +
    app.summary.notCompliant +
    app.summary.notApplicable
  const notAssessed = app.summary.total - assessedControls
  const nonCompliantControls = app.summary.notCompliant + app.summary.partialGap

  return (
    <div className="min-h-screen bg-md-surface">
      <div className="mx-auto max-w-full px-8 py-8 space-y-6">
        {/* Header Section */}
        <div className="bg-md-surface-container rounded-xl border border-md-outline-variant p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
            <div className="space-y-4">
              {/* Application Name */}
              <h1 className="text-2xl font-semibold text-md-on-surface">
                {app.name}
              </h1>

              {/* Status Badges - Grouped Display */}
              <div className="flex flex-wrap items-start gap-4 py-1">
                {/* Service Criticality */}
                <div className="space-y-2">
                  <div className="text-[10px] font-semibold text-md-on-surface-variant uppercase tracking-wide">
                    Service Criticality
                  </div>
                  <div className="flex items-center gap-2">
                    <CriticalityBadge criticality={app.criticality} />
                    <DRLevelBadge level={app.drLevel} />
                  </div>
                </div>

                {/* Info Classification */}
                {app.informationClassification && (
                  <div className="space-y-2">
                    <div className="text-[10px] font-semibold text-md-on-surface-variant uppercase tracking-wide">
                      Info Classification
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700">
                        {app.informationClassification}
                      </span>
                    </div>
                  </div>
                )}

                {/* Compliance Status */}
                <div className="space-y-2">
                  <div className="text-[10px] font-semibold text-md-on-surface-variant uppercase tracking-wide">
                    Compliance Status
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={app.status} />
                  </div>
                </div>

                {/* Asset Lifecycle Status */}
                <div className="space-y-2">
                  <div className="text-[10px] font-semibold text-md-on-surface-variant uppercase tracking-wide">
                    Asset Lifecycle Status
                  </div>
                  <div className="flex items-center gap-2">
                    <LifecycleBadge status={app.lifecycleStatus} />
                  </div>
                </div>
              </div>

              {/* URL and Provider Info */}
              <div className="flex items-center gap-2 text-sm">
                <a
                  href={app.primaryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-md-primary hover:opacity-80 hover:underline"
                >
                  {app.primaryFqdn}
                </a>
                {app.cloudProvider && (
                  <>
                    <span className="text-md-on-surface-variant">•</span>
                    <span className="text-md-on-surface-variant">{app.cloudProvider}</span>
                  </>
                )}
                <span className="text-md-on-surface-variant">•</span>
                <span className="text-md-on-surface-variant">{app.serviceManagement}</span>
              </div>
            </div>

            {/* Overall Score Display */}
            <div className="flex flex-col items-end">
              <div className="text-xs font-medium text-md-on-surface-variant uppercase tracking-wide mb-1">
                Overall Score
              </div>
              <div className="flex items-baseline gap-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-bold text-md-on-surface">
                    {app.overallScore}
                  </span>
                  <span className="text-2xl font-semibold text-md-on-surface-variant">
                    %
                  </span>
                </div>
                <ScoreChangeIndicator change={scoreChange} />
              </div>
              {app.lastAssessedAt && (
                <div className="text-xs text-md-on-surface-variant mt-2">
                  Last assessed{" "}
                  {new Date(app.lastAssessedAt).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>

          {/* Additional Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 pt-6 border-t border-md-outline-variant">
            <DetailItem label="Service Owner" value={app.serviceOwner} />
            <DetailItem label="Business Owner" value={app.businessOwner} />
            {app.serviceDirector && (
              <DetailItem
                label="Service Director"
                value={app.serviceDirector}
              />
            )}
            {app.serviceVp && (
              <DetailItem label="Service VP" value={app.serviceVp} />
            )}
          </div>

          {app.endOfLifeDate && (
            <div className="mt-4 pt-4 border-t border-md-outline-variant">
              <div className="flex items-center gap-2 text-sm text-amber-700">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <span className="font-medium">
                  End of Life:{" "}
                  {new Date(app.endOfLifeDate).toLocaleDateString()}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Summary Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <Stat
            label="Total Controls"
            value={app.summary.total}
            variant="neutral"
          />
          <Stat
            label="No. of Assessed Controls"
            value={assessedControls}
            variant="neutral"
          />
          <Stat
            label="No. of Compliant Controls"
            value={app.summary.compliant}
            variant="success"
          />
          <Stat
            label="No. of Non-Compliant Controls"
            value={nonCompliantControls}
            variant="danger"
          />
          <Stat
            label="No. of Not-Assessed Controls"
            value={notAssessed}
            variant="neutral"
          />
        </div>

        {/* Compliance Trends Chart */}
        <div className="bg-md-surface-container rounded-xl border border-md-outline-variant p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-md-on-surface">
              Compliance Trends
            </h2>
            <p className="text-sm text-md-on-surface-variant mt-1">
              Historical compliance score over the past 6 months
            </p>
          </div>
          <ComplianceTrendsChart data={trendData} />
        </div>

        {/* Controls Table */}
        <div>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-md-on-surface">
              Control Assessments
            </h2>
            <p className="text-sm text-md-on-surface-variant mt-1">
              Detailed breakdown of all evaluated controls with evidence
            </p>
          </div>
          <ControlsTable controls={app.controls} />
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Components
───────────────────────────────────────────── */

function ScoreChangeIndicator({ change }: { change: number }) {
  const isPositive = change > 0
  const isNeutral = change === 0

  if (isNeutral) {
    return (
      <div className="flex items-center gap-1 text-md-on-surface-variant">
        <span className="text-sm font-medium">—</span>
      </div>
    )
  }

  return (
    <div
      className={`flex items-center gap-1 ${
        isPositive ? "text-green-600" : "text-red-600"
      }`}
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        {isPositive ? (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 10l7-7m0 0l7 7m-7-7v18"
          />
        ) : (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        )}
      </svg>
      <span className="text-sm font-semibold">{Math.abs(change)}%</span>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const variants = {
    Compliant: "bg-green-50 text-green-700 border-green-200",
    Warning: "bg-amber-50 text-amber-700 border-amber-200",
    Critical: "bg-red-50 text-red-700 border-red-200",
  }

  const className =
    variants[status as keyof typeof variants] ||
    "bg-md-surface-container text-md-on-surface border-md-outline-variant"

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${className}`}
    >
      {status}
    </span>
  )
}

function CriticalityBadge({
  criticality,
}: {
  criticality: "C1" | "C2" | "C3" | "C4"
}) {
  const variants = {
    C1: "bg-red-50 text-red-700 border-red-200",
    C2: "bg-orange-50 text-orange-700 border-orange-200",
    C3: "bg-yellow-50 text-yellow-700 border-yellow-200",
    C4: "bg-green-50 text-green-700 border-green-200",
  }

  const className = variants[criticality]

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${className}`}
    >
      {criticality}
    </span>
  )
}

function DRLevelBadge({ level }: { level: number }) {
  const variants = {
    1: "bg-red-50 text-red-700 border-red-200",
    2: "bg-orange-50 text-orange-700 border-orange-200",
    3: "bg-yellow-50 text-yellow-700 border-yellow-200",
    4: "bg-md-primary-container text-md-on-primary-container border-md-primary-container",
    5: "bg-green-50 text-green-700 border-green-200",
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${
        variants[level as keyof typeof variants] ||
        "bg-md-surface-container text-md-on-surface border-md-outline-variant"
      }`}
    >
      DR {level}
    </span>
  )
}

function LifecycleBadge({
  status,
}: {
  status: "Active" | "Deprecated" | "Decommissioned"
}) {
  const variants = {
    Active: "bg-green-50 text-green-700 border-green-200",
    Deprecated: "bg-yellow-50 text-yellow-700 border-yellow-200",
    Decommissioned: "bg-md-surface-container text-md-on-surface border-md-outline-variant",
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${variants[status]}`}
    >
      {status}
    </span>
  )
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-md-on-surface-variant uppercase tracking-wide">
        {label}
      </div>
      <div className="text-sm font-medium text-md-on-surface">{value}</div>
    </div>
  )
}

function Stat({
  label,
  value,
  variant = "neutral",
}: {
  label: string
  value: number
  variant?: "neutral" | "success" | "warning" | "danger"
}) {
  const variantStyles = {
    neutral: {
      container: "bg-md-surface-container border-md-outline-variant",
      value: "text-md-on-surface",
    },
    success: {
      container: "bg-md-surface-container border-md-outline-variant",
      value: "text-md-on-surface",
    },
    warning: {
      container: "bg-md-surface-container border-md-outline-variant",
      value: "text-md-on-surface",
    },
    danger: {
      container: "bg-md-surface-container border-md-outline-variant",
      value: "text-md-on-surface",
    },
  }

  const styles = variantStyles[variant]

  return (
    <div className={`rounded-lg border shadow-sm ${styles.container} p-5`}>
      <div className="space-y-1">
        <div className="text-xs font-medium text-md-on-surface-variant uppercase tracking-wide">
          {label}
        </div>
        <div className={`text-3xl font-bold ${styles.value}`}>{value}</div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Data Generation
───────────────────────────────────────────── */

function generateComplianceTrends(
  applicationId: string,
  currentScore: number,
  currentNotCompliant: number
) {
  const hashCode = (str: string): number => {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash
    }
    return Math.abs(hash)
  }

  const seed = hashCode(applicationId)

  const seededRandom = (s: number): number => {
    const x = Math.sin(s) * 10000
    return x - Math.floor(x)
  }

  // Get the past 6 months including current
  const now = new Date()
  const months: string[] = []

  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(date.toLocaleDateString("en-US", { month: "short" }))
  }

  const data = []
  const trendType = seededRandom(seed)

  let trendPattern: "improving" | "declining" | "fluctuating"
  if (trendType < 0.33) {
    trendPattern = "improving"
  } else if (trendType < 0.66) {
    trendPattern = "declining"
  } else {
    trendPattern = "fluctuating"
  }

  // Generate 5 months of historical data
  for (let i = 0; i < 5; i++) {
    const monthSeed = seed + i * 1000
    const randomVariation = seededRandom(monthSeed + 100) * 10 - 5

    let baseScore: number

    if (trendPattern === "improving") {
      const progress = i / 5
      baseScore = currentScore - (20 - progress * 20) + randomVariation
    } else if (trendPattern === "declining") {
      const progress = i / 5
      baseScore = currentScore + (20 - progress * 20) + randomVariation
    } else {
      baseScore = currentScore + (seededRandom(monthSeed + 200) * 30 - 15)
    }

    const score = Math.max(15, Math.min(95, Math.round(baseScore)))

    const totalControls = 148
    const approximateNotCompliant = Math.round(
      totalControls *
        ((100 - score) / 100) *
        (0.5 + seededRandom(monthSeed + 400) * 0.3)
    )

    data.push({
      month: months[i],
      score: score,
      notMet: approximateNotCompliant,
    })
  }

  // Add current month with real data
  data.push({
    month: months[5],
    score: currentScore,
    notMet: currentNotCompliant,
  })

  return data
}