import Link from "next/link"

type CapabilityStatus = "Ready" | "Not configured" | "Experimental"

type Capability = {
  key: string
  name: string
  description: string
  href: string
  status: CapabilityStatus
  icon: React.ReactNode
}
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Capabilities",
};
const CAPABILITIES: Capability[] = [
  {
    key: "framework_baseliner",
    name: "Framework Baseliner",
    description:
      "Establish comprehensive framework-to-framework baselines enabling unified coverage analysis, automated scoring methodologies, and streamlined compliance automation across multiple regulatory standards and industry frameworks.",
    href: "/framework",
    status: "Ready",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M10 13a5 5 0 0 1 0-7l2-2a5 5 0 1 1 7 7l-1 1"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M14 11a5 5 0 0 1 0 7l-2 2a5 5 0 1 1-7-7l1-1"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    key: "soc_mapper",
    name: "SOC Mapper",
    description:
      "Automate ingestion and analysis of SOC 2 Type II audit reports, enabling intelligent evidence mapping to designated compliance frameworks for accelerated coverage assessment and systematic gap identification.",
    href: "/soc",
    status: "Ready",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M4 19V5a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path d="M14 3v5h5" stroke="currentColor" strokeWidth="2" />
        <path
          d="M7 12h10M7 15h10M7 9h5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    key: "controls_automation",
    name: "Controls Automation",
    description:
      "Deploy automated assessment workflows for designated security controls across enterprise applications, with persistent result storage and analytics to significantly reduce manual compliance validation efforts.",
    href: "/automation",
    status: "Ready",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M13 2L3 14h7l-1 8 10-12h-7l1-8z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
]

function StatusLabel({ status }: { status: CapabilityStatus }) {
  const styles =
    status === "Ready"
      ? "text-white bg-[#00a758]"
      : status === "Not configured"
        ? "text-white bg-[#f59e0b]"
        : "text-md-on-primary bg-md-primary"

  return (
    <span className={`text-xs font-bold px-3 py-1 rounded ${styles} uppercase tracking-wide`}>
      {status}
    </span>
  )
}

export default function CapabilitiesLandingPage() {
  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="rounded-xl border border-md-outline-variant bg-md-surface-container p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-md-on-surface">
          AutoGRC Capabilities
        </h1>
        <p className="mt-2 text-base text-md-on-surface-variant max-w-4xl">
          Following section provides access to AutoGRC's core capabilities for governance,
          risk, and compliance management. Launch integrated workflows for framework mapping,
          audit report analysis, and automated controls assessment to streamline your
          organization's compliance operations.
        </p>

        <div className="mt-6 flex items-center gap-4 flex-wrap">
          <div className="inline-flex items-center gap-2 text-sm font-bold text-[#00a758]">
            <div className="w-2 h-2 rounded-full bg-[#00a758] animate-pulse"></div>
            Platform Status: Operational
          </div>
          <div className="text-sm text-md-on-surface-variant">
            {CAPABILITIES.filter(c => c.status === "Ready").length} of {CAPABILITIES.length} capabilities active
          </div>
        </div>
      </div>

      {/* Capability cards */}
      <div>
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-md-on-surface">
            Available capabilities
          </h2>
          <p className="mt-1 text-base text-md-on-surface-variant max-w-4xl">
            Following section lists all GRC capabilities available in the platform.
            Each capability provides specialized functionality for different aspects
            of compliance management and regulatory adherence.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {CAPABILITIES.map((cap) => (
            <div
              key={cap.key}
              className="flex flex-col justify-between rounded-xl border border-md-outline-variant bg-md-surface-container p-6 shadow-sm hover:shadow-md transition-all"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-md-on-surface">{cap.icon}</div>
                    <h3 className="text-lg font-bold text-md-on-surface">
                      {cap.name}
                    </h3>
                  </div>

                  <Link
                    href={cap.href}
                    className="text-md-on-surface-variant hover:text-md-on-surface transition-colors"
                    title={`Open ${cap.name} in new view`}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M14 3h7v7M21 3l-9 9"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </Link>
                </div>

                <StatusLabel status={cap.status} />

                <p className="text-sm leading-relaxed text-md-on-surface-variant">
                  {cap.description}
                </p>
              </div>

              <div className="mt-6">
                <Link
                  href={cap.href}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-md-primary-container px-4 py-2.5 text-sm font-bold text-md-on-primary-container transition-colors hover:bg-md-primary hover:text-md-on-primary"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Launch Capability
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Information footer */}
      <div className="rounded-xl border border-md-outline-variant bg-md-surface-container p-6">
        <div className="flex items-start gap-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-md-on-surface-variant mt-0.5">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
            <path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <div>
            <div className="font-bold text-md-on-surface mb-1">
              Capability Configuration
            </div>
            <p className="text-sm text-md-on-surface-variant leading-relaxed">
              Capabilities marked as "Ready" are fully configured and operational.
              Capabilities requiring configuration must be set up before use.
              Experimental capabilities are in beta testing and may have limited functionality.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
