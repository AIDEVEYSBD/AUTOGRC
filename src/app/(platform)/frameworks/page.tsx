import "server-only"

import {
  getFrameworksOverview,
  getFrameworkComparisonData,
  getUnmappedControlsData,
} from "@/lib/frameworks.queries"
import { DeactivatedFrameworksProvider } from "./deactivated-context"
import { FrameworkCard } from "./framework-card"
import { ComparisonTable, UnmappedControlsTable } from "./frameworks-tables"
export const dynamic = "force-dynamic"

export default async function FrameworksPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = (await searchParams) ?? {}

  const domainParamRaw = sp.domain
  const selectedDomain =
    typeof domainParamRaw === "string" && domainParamRaw.trim().length > 0
      ? domainParamRaw
      : null

  const gapFrameworkRaw = sp.gapFramework
  const selectedGapFramework =
    typeof gapFrameworkRaw === "string" && gapFrameworkRaw.trim().length > 0
      ? gapFrameworkRaw
      : null

  const [data, comparison, gaps] = await Promise.all([
    getFrameworksOverview(),
    getFrameworkComparisonData(),
    getUnmappedControlsData(selectedGapFramework),
  ])

  return (
    <DeactivatedFrameworksProvider>
      <div className="space-y-8 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#333333]">
              Compliance Frameworks
            </h1>
            <p className="mt-1 text-base text-[#666666] max-w-4xl">
              Following section gives an overview of controls frameworks
              activated on the platform. AutoGRC also maps uploaded controls
              frameworks with the internal controls framework of the
              organization (master framework).
            </p>
          </div>

          <button className="bg-[#ffe600] text-[#333333] px-6 py-2.5 rounded font-bold transition-colors hover:bg-[#333333] hover:text-white">
            Upload Framework
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <KpiCard title="Total Frameworks" value={data.totalFrameworks} />
          <KpiCard
            title="Total Controls"
            value={data.totalControls.toLocaleString()}
          />
          <KpiCard
            title="Master Framework"
            value={data.masterFramework?.name ?? "None"}
          />
        </div>

        {/* Framework cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {data.frameworks.map(f => (
            <FrameworkCard key={f.id} framework={f} />
          ))}
        </div>

        {/* Framework Control Comparison */}
        <ComparisonTable
          comparison={comparison}
          activeDomain={selectedDomain}
          selectedGapFramework={selectedGapFramework}
        />

        {/* Unmapped Controls */}
        <UnmappedControlsTable
          gaps={gaps}
          activeDomain={selectedDomain}
          selectedGapFramework={selectedGapFramework}
        />
      </div>
    </DeactivatedFrameworksProvider>
  )
}

function KpiCard({
  title,
  value,
}: {
  title: string
  value: string | number
}) {
  return (
    <div className="rounded-lg border border-[#cccccc] bg-white p-6 shadow-sm">
      <div className="text-sm font-medium text-[#666666] uppercase tracking-wide">
        {title}
      </div>
      <div className="mt-3 text-4xl font-bold text-[#333333]">{value}</div>
    </div>
  )
}