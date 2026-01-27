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
} from "@/lib/overview.queries"
import { ComplianceByDomain } from "./ComplianceByDomain"
import { ApplicationsTable } from "./ApplicationsTable"
import { fetchControlsByDomain } from "./actions"
export const dynamic = "force-dynamic"
export const runtime = "nodejs"

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Overview",
};
/* =========================
   Helpers
========================= */

function ringColor(p: number) {
  if (p >= 70) return "#22c55e"
  if (p >= 40) return "#f59e0b"
  return "#ef4444"
}

/* =========================
   TRUE Donut (SVG)
========================= */

function Donut({
  percent,
  size = 88,
  stroke = 10,
}: {
  percent: number
  size?: number
  stroke?: number
}) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const color = ringColor(percent)
  
  // Calculate the arc path
  const center = size / 2
  const startAngle = -90 // Start at top
  const endAngle = startAngle + (percent / 100) * 360
  
  const startRad = (startAngle * Math.PI) / 180
  const endRad = (endAngle * Math.PI) / 180
  
  const x1 = center + radius * Math.cos(startRad)
  const y1 = center + radius * Math.sin(startRad)
  const x2 = center + radius * Math.cos(endRad)
  const y2 = center + radius * Math.sin(endRad)
  
  const largeArc = percent > 50 ? 1 : 0

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} style={{ transform: 'rotate(0deg)' }}>
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke="#e5e7eb"
          strokeWidth={stroke}
        />
        
        {/* Progress arc */}
        {percent > 0 && (
          <path
            d={`M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`}
            fill="transparent"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            style={{
              animation: 'fadeInArc 1s ease-out forwards',
              opacity: 0,
            }}
          />
        )}
      </svg>

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes fadeInArc {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
          @keyframes fadeInText {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
        `
      }} />

      <span 
        className="absolute text-lg font-bold text-slate-800"
        style={{
          animation: 'fadeInText 0.5s ease-out 0.8s forwards',
          opacity: 0,
        }}
      >
        {percent}%
      </span>
    </div>
  )
}

/* =========================
   Page
========================= */

export default async function OverviewPage() {
  const masterFrameworkId = await getMasterFrameworkId()
  if (!masterFrameworkId)
    return <EmptyState msg="No master framework configured." />

  const [kpis, rings, matrix, domains, masterFrameworkName] = await Promise.all([
    getOverviewKPIs(masterFrameworkId),
    getFrameworkRings(masterFrameworkId),
    getApplicationsMatrix(masterFrameworkId),
    getSecurityDomains(masterFrameworkId),
    getMasterFrameworkName(masterFrameworkId),
  ])

  // Calculate average failing controls per application
  const avgFailingControlsPerApp = kpis.totalApplications > 0 
    ? Math.round(kpis.failingMasterControls / kpis.totalApplications) 
    : 0

  // Get initial domain and controls
  const initialDomain = domains[0]?.name || null
  const initialControls = initialDomain 
    ? await getControlsByDomain(masterFrameworkId, initialDomain)
    : []

  // Create callback for domain changes
  const handleDomainChange = async (domainName: string) => {
    "use server"
    return fetchControlsByDomain(masterFrameworkId, domainName)
  }

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="max-w-4xl">
        <h1 className="text-3xl font-bold text-slate-900">
          Cybersecurity Compliance Dashboard
        </h1>
        <p className="mt-2 text-slate-600">
          Following section gives an overview of current state of organizations compliance vis-a-vis internal controls framework
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <KPICard title="Applications Tested">
          <div className="text-3xl font-bold text-slate-900">
            {kpis.applicationsCovered}/{kpis.totalApplications}
          </div>
        </KPICard>

        <KPICard title="Average Compliance Score">
          <Donut percent={kpis.averageComplianceScore} />
        </KPICard>

        <KPICard title="Total Number of Failing Controls">
          <div className="text-3xl font-bold text-slate-900">
            {kpis.failingMasterControls}
          </div>
        </KPICard>

        <KPICard title="Critical Apps at Risk">
          <div className="text-3xl font-bold text-red-600">
            {kpis.criticalApplicationsAtRisk}
          </div>
        </KPICard>
      </div>

      {/* Framework Overlap */}
      <GlassCard>
        <div className="mb-6 flex items-start justify-between">
          <div className="flex-1">
            <Link href="/frameworks">
              <h2 className="text-xl font-bold text-slate-900 hover:underline cursor-pointer">
                Internal Controls Framework
              </h2>
            </Link>

            <p className="mt-1 text-sm text-slate-600">
              Following section give an overview of internal controls framework of the organization vis-a-vis industry leading frameworks like NIST, CIS, ISO, PCI DSS, etc.
            </p>
          </div>
          
          {/* Master Framework Card */}
          <div className="rounded-lg border border-[#ffe600] bg-white p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg text-[#333333]">
                    {masterFrameworkName}
                  </h3>
                  
                </div>
                <p className="text-sm text-[#666666] mt-1">
                  Current Internal Controls
                  <br />
                  Framework
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
          {rings.map(fw => (
            <div key={fw.id} className="flex flex-col items-center text-center">
              <Donut percent={fw.percent} />
              <p className="mt-3 text-sm font-semibold text-slate-800">
                {fw.name}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {fw.fullOverlap} full · {fw.partialOverlap} partial
              </p>
              <p className="text-xs text-slate-400">
                {fw.total} total
              </p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Applications Compliance */}
      <GlassCard>
        <div className="mb-4">
          <Link href="/applications">
            <h2 className="text-xl font-bold text-slate-900 hover:underline cursor-pointer">
              Applications Compliance Score
            </h2>
          </Link>

          <p className="mt-1 text-sm text-slate-600">
            Following section gives an overview of compliance score of all applications vis-a-vis frameworks activated on the platform
          </p>
        </div>

        <ApplicationsTable matrix={matrix} />
      </GlassCard>

      {/* Compliance by Domain */}
      <ComplianceByDomain
        domains={domains}
        initialDomain={initialDomain}
        initialControls={initialControls}
        onDomainChange={handleDomainChange}
      />
    </div>
  )
}

/* =========================
   Shared Components
========================= */

function KPICard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm p-5 flex flex-col items-center justify-center text-center min-h-[140px] hover:shadow-md transition-shadow">
      <p className="mb-3 text-sm font-medium text-slate-600 uppercase tracking-wide">
        {title}
      </p>
      <div className="flex-1 flex items-center justify-center">
        {children}
      </div>
    </div>
  )
}

function GlassCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm p-6">
      {children}
    </div>
  )
}

function EmptyState({ msg }: { msg: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 m-6">
      <h1 className="text-2xl font-bold text-slate-900">Overview</h1>
      <p className="mt-3 text-slate-600">{msg}</p>
    </div>
  )
}