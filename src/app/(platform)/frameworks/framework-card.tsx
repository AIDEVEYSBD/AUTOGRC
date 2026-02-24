"use client"

import { useDeactivatedFrameworks } from "./deactivated-context"
import { useState, useTransition } from "react"
import { FrameworkDetailsModal } from "./framework-details-modal"
import { fetchFrameworkDetails } from "./framework-actions"

type Framework = {
  id: string
  name: string
  version: string | null
  isMaster: boolean
  totalControls: number
  mappedControls: number
  percentMapped: number
}

type FrameworkDetails = Awaited<ReturnType<typeof fetchFrameworkDetails>>

export function FrameworkCard({ framework }: { framework: Framework }) {
  const { deactivated, toggleFramework, mounted } = useDeactivatedFrameworks()
  const [showModal, setShowModal] = useState(false)
  const [frameworkDetails, setFrameworkDetails] = useState<FrameworkDetails | null>(null)
  const [isPending, startTransition] = useTransition()

  const isDeactivated = mounted && deactivated.has(framework.id)

  const colorClass =
    framework.percentMapped < 40
      ? "bg-[#e41f13]"
      : framework.percentMapped < 70
      ? "bg-[#f59e0b]"
      : "bg-[#00a758]"

  const textColorClass =
    framework.percentMapped < 40
      ? "text-[#e41f13]"
      : framework.percentMapped < 70
      ? "text-[#f59e0b]"
      : "text-[#00a758]"

  // Clamp so the circle never goes out of bounds
  const indicatorLeft = Math.min(
    Math.max(framework.percentMapped, 4),
    96
  )

  const handleCardClick = () => {
    startTransition(async () => {
      const details = await fetchFrameworkDetails(framework.id)
      setFrameworkDetails(details)
      setShowModal(true)
    })
  }

  return (
    <>
      <div
        onClick={handleCardClick}
        className={`rounded-xl border bg-md-surface-container p-6 shadow-sm transition-all hover:shadow-md cursor-pointer ${
          isDeactivated ? "border-md-outline opacity-60" : "border-md-outline-variant"
        } ${isPending ? "opacity-50" : ""}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-md-on-surface">
                {framework.name}
              </h3>

              {framework.isMaster && (
                <span className="text-xs px-2 py-0.5 rounded bg-md-primary-container text-md-on-primary-container font-bold">
                  MASTER
                </span>
              )}

              {isDeactivated && (
                <span className="text-xs px-2 py-0.5 rounded bg-md-surface-container-high text-md-on-surface-variant font-bold">
                  INACTIVE
                </span>
              )}
            </div>

            {framework.version && (
              <p className="text-sm text-md-on-surface-variant mt-1">
                Version {framework.version}
              </p>
            )}
          </div>
        </div>

        {/* Master */}
        {framework.isMaster ? (
          <div className="text-center py-8">
            <div className="text-5xl font-bold text-md-on-surface">
              {framework.totalControls}
            </div>
            <div className="mt-2 text-sm text-md-on-surface-variant">Total Controls</div>
          </div>
        ) : (
          /* Progress */
          <div className="mt-6 space-y-4">
            <div className="text-sm text-md-on-surface-variant">
              {framework.mappedControls} of {framework.totalControls} controls
              mapped
            </div>

            <div className="relative">
              {/* Bar */}
              <div className="h-2.5 rounded-full bg-md-outline-variant overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${colorClass}`}
                  style={{ width: `${framework.percentMapped}%` }}
                />
              </div>

              {/* Circle indicator */}
              <div
                className={`absolute -top-5 flex items-center justify-center w-10 h-10 rounded-full text-sm font-extrabold text-white shadow ${colorClass}`}
                style={{
                  left: `calc(${indicatorLeft}% - 20px)`,
                }}
              >
                {framework.percentMapped}%
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between gap-3">
          <div className="text-sm text-md-on-surface-variant">
            {framework.totalControls} controls
          </div>

          {!framework.isMaster && mounted && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleFramework(framework.id)
              }}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors font-medium ${
                isDeactivated
                  ? "border-[#00a758] text-[#00a758] hover:bg-[#00a758] hover:text-white"
                  : "border-md-outline-variant text-md-on-surface hover:bg-md-surface-container-high"
              }`}
              title={
                isDeactivated
                  ? "Activate this framework"
                  : "Deactivate this framework"
              }
            >
              {isDeactivated ? "Activate" : "Deactivate"}
            </button>
          )}
        </div>

        {isPending && (
          <div className="mt-2 text-xs text-center text-md-on-surface-variant">
            Loading framework details...
          </div>
        )}
      </div>

      {showModal && frameworkDetails && (
        <FrameworkDetailsModal
          framework={frameworkDetails}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}