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
    <div className="min-h-screen w-full">
      {/* HEADER */}
      <section className="w-full bg-md-surface-container border-b border-md-outline-variant p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-md-on-surface">Applications</h1>
        <p className="mt-1 text-sm text-md-on-surface-variant">
          Monitor security posture and compliance across all your applications.
        </p>
      </section>

      {/* KPI METRICS */}
      <section className="w-full grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4 p-6">
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
      <section className="w-full p-6">
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
    <div className="bg-card border border-bd p-4 min-h-[120px] flex flex-col gap-3 min-w-0">
      <div className="min-w-0">
        <div className="text-[11px] font-bold text-muted uppercase tracking-wide leading-tight truncate">
          {label}
        </div>
        {sublabel && (
          <div className="text-[11px] font-bold text-muted uppercase tracking-wide leading-tight truncate">
            {sublabel}
          </div>
        )}
      </div>
      <div className="mt-auto min-w-0">
        <div className="text-3xl font-bold text-ink leading-none">
          {count}
        </div>
        <div className="mt-2 min-w-0">
          <div className="text-[10px] font-bold text-muted uppercase tracking-wide truncate">
            Avg compliance
          </div>
          <div className="text-sm font-bold text-ink2">
            {avgScore}%
          </div>
        </div>
      </div>
    </div>
  )
}
