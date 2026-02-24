import "server-only"

import {
  getFrameworksOverview,
  getFrameworkComparisonData,
  getUnmappedControlsData,
} from "@/lib/frameworks.queries"
import { DeactivatedFrameworksProvider } from "./deactivated-context"
import { FrameworkCard } from "./framework-card"
import { ComparisonTable, UnmappedControlsTable } from "./frameworks-tables"

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Frameworks",
};
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-md-on-surface">
              Compliance Frameworks
            </h1>
            <p className="mt-1 text-base text-md-on-surface-variant max-w-4xl">
              Following section gives an overview of controls frameworks
              activated on the platform. AutoGRC also maps uploaded controls
              frameworks with the internal controls framework of the
              organization (master framework).
            </p>
          </div>

          <button className="flex-shrink-0 bg-md-primary-container text-md-on-primary-container px-6 py-2.5 rounded-lg font-bold transition-colors hover:bg-md-primary hover:text-md-on-primary">
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
    <div className="rounded-xl border border-md-outline-variant bg-md-surface-container p-6 shadow-sm">
      <div className="text-sm font-medium text-md-on-surface-variant uppercase tracking-wide">
        {title}
      </div>
      <div className="mt-3 text-4xl font-bold text-md-on-surface">{value}</div>
    </div>
  )
}