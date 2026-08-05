import "server-only"
import Link from "next/link"

import {
  getMasterFrameworkId,
  getMasterFrameworkName,
  getOverviewKPIs,
  getFrameworkRings,
  getApplicationsMatrix,
  getSecurityDomains,
  getControlsByDomain,
  getControlsAutomation,
  getControlTestStatus,
  getRecentActivity,
  getActiveFrameworkCount,
} from "@/lib/overview.queries"
import { ComplianceByDomain } from "./ComplianceByDomain"
import { ApplicationsTable } from "./ApplicationsTable"
import { fetchControlsByDomain } from "./actions"
import { Card, CardTitle, Bar } from "@/components/ey/ui"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

import { Metadata } from "next"
export const metadata: Metadata = { title: "Overview" }

export default async function OverviewPage() {
  const masterFrameworkId = await getMasterFrameworkId()
  if (!masterFrameworkId) return <EmptyState msg="No master framework configured." />

  const [kpis, rings, matrix, domains, masterFrameworkName, automation, testStatus, activity, fwCount] =
    await Promise.all([
      getOverviewKPIs(masterFrameworkId),
      getFrameworkRings(masterFrameworkId),
      getApplicationsMatrix(masterFrameworkId),
      getSecurityDomains(masterFrameworkId),
      getMasterFrameworkName(masterFrameworkId),
      getControlsAutomation(),
      getControlTestStatus(),
      getRecentActivity(6),
      getActiveFrameworkCount(),
    ])

  const initialDomain = domains[0]?.name || null
  const initialControls = initialDomain ? await getControlsByDomain(masterFrameworkId, initialDomain) : []

  const handleDomainChange = async (domainName: string) => {
    "use server"
    return fetchControlsByDomain(masterFrameworkId, domainName)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="relative flex min-h-[160px] flex-col gap-2 p-6">
          <div className="absolute left-0 right-0 top-0 h-1" style={{ background: "#FFE600" }} />
          <div className="text-[12px] font-bold text-muted">Compliance posture</div>
          <div className="my-1 self-start px-2 text-[44px] font-bold leading-none sm:text-[52px]" style={{ background: "#FFE600", color: "#1A1A24", letterSpacing: "-0.035em" }}>
            {kpis.averageComplianceScore}%
          </div>
          <div className="text-[13px] text-ink2">Across {fwCount} active frameworks</div>
          <div className="mt-auto pt-2 text-[11px] text-muted">Master framework · {masterFrameworkName}</div>
        </Card>

        <Card className="flex min-h-[160px] flex-col gap-2 p-6">
          <div className="text-[12px] font-bold text-muted">Controls automated</div>
          <div className="text-[44px] font-bold leading-none text-ink sm:text-[52px]" style={{ letterSpacing: "-0.035em" }}>
            {automation.automated.toLocaleString()}
          </div>
          <div className="text-[13px] text-ink2">of {automation.total.toLocaleString()} total controls</div>
          <div className="mt-auto pt-2 text-[11px] text-muted">{automation.pct}% automation coverage</div>
        </Card>

        <Card className="flex min-h-[160px] flex-col gap-2 p-6">
          <div className="text-[12px] font-bold text-muted">Applications assessed</div>
          <div className="text-[44px] font-bold leading-none text-ink sm:text-[52px]" style={{ letterSpacing: "-0.035em" }}>
            {kpis.applicationsCovered}<span className="text-[24px] text-muted">/{kpis.totalApplications}</span>
          </div>
          <div className="text-[13px] text-ink2">applications with assessments</div>
          <div className="mt-auto pt-2 text-[11px] text-muted">{kpis.masterCoveragePercent}% master control coverage</div>
        </Card>

        <Card className="flex min-h-[160px] flex-col gap-2 p-6">
          <div className="text-[12px] font-bold text-muted">Failing controls</div>
          <div className="text-[44px] font-bold leading-none text-ink sm:text-[52px]" style={{ letterSpacing: "-0.035em" }}>
            {kpis.failingMasterControls}
          </div>
          <div className="text-[13px] text-ink2">master controls scoring ≤ 50</div>
          <div className="mt-auto pt-2 text-[11px] text-muted">{kpis.criticalApplicationsAtRisk} critical apps at risk</div>
        </Card>
      </div>

      {/* Framework coverage + test status */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <CardTitle title="Compliance by framework" sub="Weighted coverage of mapped controls · Source: AutoGRC mapping engine" />
          <div className="flex flex-col gap-3.5">
            {rings.length === 0 && <div className="text-[13px] text-muted">No framework mappings yet.</div>}
            {rings.map((f) => (
              <div key={f.id} className="flex items-center gap-3.5">
                <span className="w-28 flex-none truncate text-[12px] font-bold text-ink">{f.name}</span>
                <Bar pct={f.percent} color="#1777CF" />
                <span className="w-10 flex-none text-right text-[13px] font-bold text-ink">{f.percent}%</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <CardTitle title="Control test status" sub={`${kpis.totalApplications} apps · latest assessments`} />
          <div className="mb-4 flex h-4 w-full overflow-hidden">
            {testStatus.map((t) => (
              <div key={t.label} style={{ width: `${t.pct}%`, background: t.color }} />
            ))}
          </div>
          <div className="flex flex-col gap-2.5">
            {testStatus.map((t) => (
              <div key={t.label} className="flex items-center gap-2.5">
                <span className="h-[11px] w-[11px] flex-none" style={{ background: t.color }} />
                <span className="flex-1 text-[13px] text-ink2">{t.label}</span>
                <span className="text-[13px] font-bold text-ink">{t.n.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent activity (real) */}
      <Card className="flex flex-col p-6">
        <CardTitle title="Recent activity" />
        <div className="flex flex-col">
          {activity.length === 0 && <div className="text-[13px] text-muted">No recent activity recorded.</div>}
          {activity.map((a, i) => (
            <div key={i} className="flex gap-3.5 border-t border-hair py-3 first:border-t-0">
              <span className="mt-1.5 h-2.5 w-2.5 flex-none" style={{ background: a.color }} />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[13px] leading-snug text-ink">{a.text}</span>
                <span className="text-[11px] text-muted">{a.meta}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Preserved: Applications compliance matrix (real) */}
      <Card className="p-6">
        <div className="mb-4">
          <Link href="/applications">
            <h2 className="m-0 text-[16px] font-bold text-ink hover:underline" style={{ letterSpacing: "-0.02em" }}>
              Applications compliance score
            </h2>
          </Link>
          <p className="mt-1 text-[12px] text-muted">Compliance of every application against frameworks activated on the platform</p>
        </div>
        <ApplicationsTable matrix={matrix} />
      </Card>

      {/* Preserved: Compliance by domain drill-down (real) */}
      <ComplianceByDomain
        domains={domains}
        initialDomain={initialDomain}
        initialControls={initialControls}
        onDomainChange={handleDomainChange}
      />
    </div>
  )
}

function EmptyState({ msg }: { msg: string }) {
  return (
    <Card className="m-2 p-8">
      <h1 className="m-0 text-2xl font-bold text-ink">Overview</h1>
      <p className="mt-3 text-muted">{msg}</p>
    </Card>
  )
}
