import "server-only"

import {
  getFrameworksOverview,
  getFrameworkComparisonData,
  getUnmappedControlsData,
} from "@/lib/frameworks.queries"

import { DeactivatedFrameworksProvider } from "./deactivated-context"
import { FrameworkCard } from "./framework-card"
import {
  ComparisonTable,
} from "./frameworks-tables"

import { Metadata } from "next"

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Frameworks",
}

export default async function FrameworksPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = (await searchParams) ?? {}

  const selectedDomain =
    typeof sp.domain === "string" && sp.domain.trim().length > 0
      ? sp.domain
      : null

  const selectedGapFramework =
    typeof sp.gapFramework === "string" && sp.gapFramework.trim().length > 0
      ? sp.gapFramework
      : null

  const [data, comparison, gaps] = await Promise.all([
    getFrameworksOverview(),
    getFrameworkComparisonData(),
    getUnmappedControlsData(selectedGapFramework),
  ])

  return (
    <DeactivatedFrameworksProvider>
      <div className="p-10 space-y-16 text-white">

        {/* HEADER */}
        <div className="flex items-start justify-between gap-6">
          <div>
            
          </div>

          <Button className="bg-yellow-400 text-black font-bold px-6 py-2.5 hover:bg-yellow-300">
            Upload Framework
          </Button>
        </div>

        {/* KPI GRID */}
        {/* TOP SPLIT SECTION */}
<div className="grid grid-cols-2 gap-6 max-h-[520px]  pr-2">

{/* LEFT: COMPLIANCE FRAMEWORKS (KPIs + INFO) */}
<div className="space-y-6">

  <h2 className="text-3xl font-bold hover:text-yellow-400 transition">
    Compliance Frameworks
  </h2>

  <p className="text-white/60 max-w-xl hover:text-white transition">
    High-level overview of control frameworks enabled on the platform and
    their relationship with the internal master framework.
  </p>

  <div className="grid grid-cols-2 gap-6">
    <MetricCard title="Total Frameworks">
      {data.totalFrameworks}
    </MetricCard>

    <MetricCard title="Total Controls">
      {data.totalControls.toLocaleString()}
    </MetricCard>

    <MetricCard title="Master Framework ">
      {data.masterFramework?.name ?? "None"}
    </MetricCard>
  </div>
</div>

{/* RIGHT: ACTIVE FRAMEWORKS */}
<div className="space-y-6">

  <h2 className="text-3xl font-bold hover:text-yellow-400 transition">
    Active Frameworks
  </h2>

  <div className="grid grid-cols-2 gap-6 max-h-[520px] pr-2">
    {data.frameworks.map((fw) => (
      <FrameworkCard key={fw.id} framework={fw} />
    ))}
  </div>
</div>
</div>

        {/* FRAMEWORK COMPARISON */}
        <div>
          <h2 className="text-3xl font-bold mb-4 pt-20 hover:text-yellow-400 transition">
            Framework Control Comparison
          </h2>

          

          <Card className="glass-dark hover:border-yellow-400 hover:shadow-[0_0_20px_rgba(250,204,21,0.35)] transition">
            <CardContent className="p-0">
              <ComparisonTable
                comparison={comparison}
                activeDomain={selectedDomain}
                selectedGapFramework={selectedGapFramework}
              />
            </CardContent>
          </Card>
        </div>

        {/* UNMAPPED CONTROLS */}
        {/* <div>
          <h2 className="text-3xl font-bold mb-4 hover:text-yellow-400 transition">
            Unmapped Controls
          </h2>

          <Card className="glass-dark">
            <CardContent className="p-0">
              <UnmappedControlsTable
                gaps={gaps}
                activeDomain={selectedDomain}
                selectedGapFramework={selectedGapFramework}
              />
            </CardContent>
          </Card>
        </div> */}
      </div>
    </DeactivatedFrameworksProvider>
  )
}

/* ---------------------------------
 Reusable KPI Card (same language as Overview)
---------------------------------- */

function MetricCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <Card className="glass-dark text-center transition-all hover:shadow-[0_0_0_1px_rgba(250,204,21,0.5),0_20px_60px_rgba(250,204,21,0.25)]">
      <CardHeader>
        <CardDescription className="uppercase tracking-wide text-xs text-white/60 hover:text-white transition">
          {title}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-4xl font-bold hover:text-yellow-400 transition">
        {children}
      </CardContent>
    </Card>
  )
}
