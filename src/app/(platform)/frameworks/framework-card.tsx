"use client"

import { useDeactivatedFrameworks } from "./deactivated-context"
import { useState, useTransition } from "react"
import { FrameworkDetailsModal } from "./framework-details-modal"
import { fetchFrameworkDetails } from "./framework-actions"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

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
  const [frameworkDetails, setFrameworkDetails] =
    useState<FrameworkDetails | null>(null)
  const [isPending, startTransition] = useTransition()

  const isDeactivated = mounted && deactivated.has(framework.id)

  const barColor =
    framework.percentMapped < 40
      ? "bg-red-500"
      : framework.percentMapped < 70
      ? "bg-yellow-400"
      : "bg-green-500"

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
        className={cn(
          "rounded-xl border p-6 cursor-pointer transition-all",
          "glass-dark border-white/10",
          "hover:border-yellow-400 hover:shadow-[0_0_0_1px_rgba(250,204,21,0.4),0_20px_60px_rgba(250,204,21,0.25)]",
          isDeactivated && "opacity-50",
          isPending && "opacity-60"
        )}
      >
        {/* ================= HEADER ================= */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white">
                {framework.name}
              </h3>

              {framework.isMaster && (
                <span className="text-xs px-2 py-0.5 rounded bg-yellow-400 text-black font-bold">
                  MASTER
                </span>
              )}

              {isDeactivated && (
                <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-white/60 font-bold">
                  INACTIVE
                </span>
              )}
            </div>

            {framework.version && (
              <p className="text-sm text-white/60 mt-1">
                Version {framework.version}
              </p>
            )}
          </div>
        </div>

        {/* ================= MASTER ================= */}
        {framework.isMaster ? (
          <div className="py-10 text-center">
            <div className="text-5xl font-extrabold text-white">
              {framework.totalControls}
            </div>
            <div className="mt-2 text-sm text-white/60">
              Total Controls
            </div>
          </div>
        ) : (
          /* ================= PROGRESS ================= */
          <div className="mt-6 space-y-4">
            <div className="text-sm text-white/60">
              {framework.mappedControls} of {framework.totalControls} controls mapped
            </div>

            <div className="relative">
              {/* Bar */}
              <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", barColor)}
                  style={{ width: `${framework.percentMapped}%` }}
                />
              </div>

              {/* Indicator */}
              <div
                className={cn(
                  "absolute -top-5 w-10 h-10 rounded-full flex items-center justify-center",
                  "text-sm font-extrabold text-black shadow",
                  barColor
                )}
                style={{
                  left: `calc(${indicatorLeft}% - 20px)`,
                }}
              >
                {framework.percentMapped}%
              </div>
            </div>
          </div>
        )}

        {/* ================= FOOTER ================= */}
        <div className="mt-6 flex items-center justify-between gap-3">
          <div className="text-sm text-white/60">
            {framework.totalControls} controls
          </div>

          {!framework.isMaster && mounted && (
            <Button
              size="sm"
              variant={isDeactivated ? "outline" : "ghost"}
              onClick={(e) => {
                e.stopPropagation()
                toggleFramework(framework.id)
              }}
              className={cn(
                "text-xs",
                isDeactivated
                  ? "border-green-400 text-green-400 hover:bg-green-400 hover:text-black"
                  : "text-white border-white-400 hover:bg-yellow-400 hover:text-black"
              )}
            >
              {isDeactivated ? "Activate" : "Deactivate"}
            </Button>
          )}
        </div>

        {isPending && (
          <div className="mt-3 text-xs text-center text-white/50">
            Loading framework details…
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
