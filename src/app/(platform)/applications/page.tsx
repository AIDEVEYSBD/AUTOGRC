import { getApplicationsOverview } from "@/lib/applications.queries"
import ApplicationsTable from "./applications-table"

import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Applications",
}

/* ─────────────────────────────────────────────
   Page
───────────────────────────────────────────── */
export const dynamic = "force-dynamic"

export default async function ApplicationsPage() {
  const { kpis, rows } = await getApplicationsOverview()

  return (
    <div className="min-h-screen bg-gray-50 w-full">
      {/* HEADER */}
      <section className="w-full bg-white border-b border-gray-200 p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">Applications</h1>
        <p className="mt-1 text-sm text-gray-600">
          Monitor security posture and compliance across all your applications.
        </p>
      </section>

      {/* KPI METRICS */}
      <section className="w-full grid grid-cols-6 gap-4 p-6 bg-gray-50">
        <MetricCard 
          label="Total" 
          sublabel="Applications"
          count={kpis.totalApplications}
          avgScore={kpis.totalAvgScore}
        />
        <MetricCard 
          label="Vendor" 
          sublabel="Managed Cloud"
          count={kpis.byServiceManagement.vendorManagedCloud.count}
          avgScore={kpis.byServiceManagement.vendorManagedCloud.avgScore}
        />
        <MetricCard 
          label="Org-Managed" 
          sublabel="Cloud"
          count={kpis.byServiceManagement.orgManagedCloud.count}
          avgScore={kpis.byServiceManagement.orgManagedCloud.avgScore}
        />
        <MetricCard 
          label="Hybrid" 
          count={kpis.byServiceManagement.hybrid.count}
          avgScore={kpis.byServiceManagement.hybrid.avgScore}
        />
        <MetricCard 
          label="On-Premise" 
          count={kpis.byServiceManagement.onPremise.count}
          avgScore={kpis.byServiceManagement.onPremise.avgScore}
        />
        <MetricCard 
          label="SaaS" 
          count={kpis.byServiceManagement.saas.count}
          avgScore={kpis.byServiceManagement.saas.avgScore}
        />
      </section>

      {/* TABLE */}
      <section className="w-full p-6 bg-gray-50">
        <ApplicationsTable rows={rows} />
      </section>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Components
───────────────────────────────────────────── */
function MetricCard({
  label,
  sublabel,
  count,
  avgScore,
}: {
  label: string
  sublabel?: string
  count: number
  avgScore: number
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-4 h-[130px] flex flex-col justify-between">
      <div className="space-y-0.5">
        <div className="text-xs font-medium text-gray-600 uppercase tracking-wide leading-tight">
          {label}
        </div>
        {sublabel && (
          <div className="text-xs font-medium text-gray-600 uppercase tracking-wide leading-tight">
            {sublabel}
          </div>
        )}
      </div>
      <div className="mt-auto w-full">
        <div className="text-3xl font-bold text-gray-900 mb-2">
          {count}
        </div>
        <div className="flex items-center justify-between w-full">
          <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
            Avg Compliance
          </div>
          <div className="text-sm font-semibold text-gray-500">
            {avgScore}%
          </div>
        </div>
      </div>
    </div>
  )
}
