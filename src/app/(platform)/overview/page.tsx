import "server-only"
import Link from "next/link"
import { Metadata } from "next"

import {
  getMasterFrameworkId,
  getMasterFrameworkName,
  getOverviewKPIs,
  getFrameworkRings,
  getApplicationsMatrix,
  getSecurityDomains,
  getControlsByDomain,
} from "@/lib/overview.queries"

import { fetchControlsByDomain } from "./actions"
import { ComplianceByDomain } from "./ComplianceByDomain"
import {ApplicationsTable} from "./ApplicationsTable"
import {AnimatedDonut} from "./AnimatedDonut"
import {AnimatedNumber} from "./AnimatedNumber"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"


export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const metadata: Metadata = {
  title: "Compliance Overview",
}


export default async function OverviewPage() {
  const masterFrameworkId = await getMasterFrameworkId()
  if (!masterFrameworkId) return null

  const [
    kpis,
    rings,
    matrix,
    domains,
    masterFrameworkName,
  ] = await Promise.all([
    getOverviewKPIs(masterFrameworkId),
    getFrameworkRings(masterFrameworkId),
    getApplicationsMatrix(masterFrameworkId),
    getSecurityDomains(masterFrameworkId),
    getMasterFrameworkName(masterFrameworkId),
  ])

  const initialDomain = domains[0]?.name || null
  const initialControls = initialDomain
    ? await getControlsByDomain(masterFrameworkId, initialDomain)
    : []

  const handleDomainChange = async (domainName: string) => {
    "use server"
    return fetchControlsByDomain(masterFrameworkId, domainName)
  }

  return (
    <div className="p-10 space-y-16 text-white">

      {/* HEADER */}
      <div>
        <h1 className="text-4xl font-bold hover:text-yellow-400 transition">
          Compliance Overview
        </h1>
        <p className="mt-3 text-white/60 max-w-3xl hover:text-white">
          Real-time visibility into organizational compliance posture across
          frameworks, applications, and security domains.
        </p>
      </div>

      {/* KPI + INSIGHTS */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

        {/* KPI GRID */}
        {/* LEFT: KPI GRID */}
<div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
  <MetricCard title="Applications Covered">
    <AnimatedNumber
      value={kpis.applicationsCovered}
      suffix={`/${kpis.totalApplications}`}
    />
  </MetricCard>

  <MetricCard title="Average Compliance">
    <AnimatedDonut percent={kpis.averageComplianceScore} />
  </MetricCard>

  <MetricCard title="Failing Controls">
    <AnimatedNumber
      value={kpis.failingMasterControls}
      className="text-red-400"
    />
  </MetricCard>

  <MetricCard title="Critical Apps at Risk">
    <AnimatedNumber
      value={kpis.criticalApplicationsAtRisk}
      className="text-yellow-400"
    />
  </MetricCard>
</div>

       {/* RIGHT: FRAMEWORK INSIGHTS */}
<Card className="glass-dark hover:border-yellow-400 transition-all hover:shadow-[0_0_0_1px_rgba(250,204,21,0.5),0_20px_60px_rgba(250,204,21,0.25)]">
  <CardHeader>
    <CardTitle className="hover:text-yellow-400 text-2xl transition">
      Internal Controls Framework
    </CardTitle>
    <CardDescription className="text-white/60 text-xl hover:text-white">
    Current Internal Controls
    Framework-  {masterFrameworkName}
    </CardDescription>
  </CardHeader>

  <CardContent className="grid grid-cols-2 gap-6">
    {rings.slice(0, 4).map((fw) => (
      <div key={fw.id} className="text-center space-y-2">
        <AnimatedDonut percent={fw.percent} />
        <p className="font-semibold hover:text-yellow-400 transition">
          {fw.name}
        </p>
        <p className="text-xs text-white/50 hover:text-white">
          {fw.fullOverlap} full · {fw.partialOverlap} partial
        </p>
      </div>
    ))}
  </CardContent>
</Card>

      </div>

      <div className="mb-10">
        <h1 className="text-4xl font-bold hover:text-yellow-400 transition">
          Applications Compliance
        </h1>
        <p className="mt-3 text-white/60 max-w-3xl ">
          Compliance posture across all onboarded applications
        </p>
      </div>
      {/* APPLICATIONS TABLE */}
        <CardContent>
        <ApplicationsTable  matrix={matrix} />
        </CardContent>


      {/* COMPLIANCE BY DOMAIN */}
      <ComplianceByDomain
        domains={domains}
        initialDomain={initialDomain}
        initialControls={initialControls}
        onDomainChange={handleDomainChange}
      />
    </div>
  )
}

/* -----------------------------
 Components
----------------------------- */

function MetricCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <Card className="glass-dark text-center transition-all hover:border-yellow-400 hover:shadow-[0_0_0_1px_rgba(250,204,21,0.5),0_20px_60px_rgba(250,204,21,0.25)]">
      <CardHeader>
        <CardDescription className="uppercase tracking-wide text-xs text-white/60 hover:text-white transition">
          {title}
        </CardDescription>
      </CardHeader>
      <CardContent className="min-h-[120px] flex items-center justify-center hover:text-yellow-400 transition">
        {children}
      </CardContent>
    </Card>
  )
}

