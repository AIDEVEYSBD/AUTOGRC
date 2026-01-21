import { getApplicationsOverview } from "@/lib/applications.queries"
import ApplicationsTable from "./applications-table"

/* ─────────────────────────────────────────────
   Page
───────────────────────────────────────────── */

export default async function ApplicationsPage() {
  const { kpis, rows } = await getApplicationsOverview()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-full px-8 py-8 space-y-6">
        {/* HEADER */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-gray-900">Applications</h1>
          <p className="mt-1 text-sm text-gray-600">
            Monitor security posture and compliance across all your applications.
          </p>
        </div>

        {/* KPI METRICS */}
        <div className="grid grid-cols-5 gap-4">
          <MetricCard label="Total Applications" value={kpis.totalApplications} />
          <MetricCard label="Compliant" value={kpis.compliant} variant="success" />
          <MetricCard label="Warning" value={kpis.warning} variant="warning" />
          <MetricCard label="Critical" value={kpis.critical} variant="danger" />
          <MetricCard label="Avg Score" value={`${kpis.avgScore}%`} />
        </div>

        {/* TABLE */}
        <ApplicationsTable rows={rows} />
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Components
───────────────────────────────────────────── */
export const dynamic = "force-dynamic"

function MetricCard({
  label,
  value,
  variant = "neutral",
}: {
  label: string
  value: string | number
  variant?: "neutral" | "success" | "warning" | "danger"
}) {
  const variants = {
    neutral: {
      container: "bg-white border-gray-200",
      value: "text-gray-900"
    },
    success: {
      container: "bg-white border-gray-200",
      value: "text-gray-900"
    },
    warning: {
      container: "bg-white border-gray-200",
      value: "text-gray-900"
    },
    danger: {
      container: "bg-white border-gray-200",
      value: "text-gray-900"
    }
  }
  
  const styles = variants[variant]

  return (
    <div
      className={`rounded-lg border shadow-sm ${styles.container} p-5`}
    >
      <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">
        {label}
      </div>
      <div className={`mt-2 text-3xl font-bold ${styles.value}`}>
        {value}
      </div>
    </div>
  )
}