"use client"

import { useState, useTransition } from "react"
import {
  updateControlMetadata,
  updateControlApplicabilities,
  fetchFrameworkDetails,
} from "./framework-actions"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type FrameworkDetailsControl = {
  id: string
  controlCode: string
  domain: string
  subDomain: string | null
  statement: string
  testingProcedure: string | null
  controlType: string | null
  controlScope: string | null
  isAutomated: boolean | null
  applicabilityIds: string[]
}

type FrameworkDetails = {
  id: string
  name: string
  version: string | null
  isMaster: boolean
  totalControls: number
  controls: FrameworkDetailsControl[]
  availableApplicabilities: {
    id: string
    code: string
    name: string
    description: string | null
  }[]
}

export function FrameworkDetailsModal({
  framework: initialFramework,
  onClose,
}: {
  framework: FrameworkDetails
  onClose: () => void
}) {
  const [framework, setFramework] = useState(initialFramework)
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null)
  const [editingControl, setEditingControl] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const domains = Array.from(
    new Set(framework.controls.map(c => c.domain))
  ).sort()

  const filteredControls = selectedDomain
    ? framework.controls.filter(c => c.domain === selectedDomain)
    : framework.controls

  const handleMetadataChange = async (
    controlId: string,
    field: "controlType" | "controlScope" | "isAutomated",
    value: string | boolean | null
  ) => {
    setFramework(prev => ({
      ...prev,
      controls: prev.controls.map(c =>
        c.id === controlId ? { ...c, [field]: value } : c
      ),
    }))

    startTransition(async () => {
      const result = await updateControlMetadata(controlId, { [field]: value })
      if (result.success) {
        const refreshed = await fetchFrameworkDetails(framework.id)
        refreshed && setFramework(refreshed)
      }
    })
  }

  const handleApplicabilityToggle = async (
    controlId: string,
    applicabilityId: string,
    currentIds: string[]
  ) => {
    const newIds = currentIds.includes(applicabilityId)
      ? currentIds.filter(id => id !== applicabilityId)
      : [...currentIds, applicabilityId]

    setFramework(prev => ({
      ...prev,
      controls: prev.controls.map(c =>
        c.id === controlId ? { ...c, applicabilityIds: newIds } : c
      ),
    }))

    startTransition(async () => {
      const result = await updateControlApplicabilities(controlId, newIds)
      if (result.success) {
        const refreshed = await fetchFrameworkDetails(framework.id)
        refreshed && setFramework(refreshed)
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="glass-dark border border-white/10 w-full max-w-7xl max-h-[90vh] rounded-xl flex flex-col overflow-hidden">

        {/* ================= HEADER (FIXED) ================= */}
        <div className="sticky top-0 z-10 glass-dark border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {framework.name}
            </h2>
            {framework.version && (
              <p className="text-sm text-white/60 mt-1">
                Version {framework.version} • {framework.totalControls} controls
              </p>
            )}
          </div>

          <Button
            variant="ghost"
            onClick={onClose}
            className="text-white hover:bg-white/10"
          >
            ✕
          </Button>
        </div>

        {/* ================= BODY ================= */}
        <div className="flex flex-1 overflow-hidden">

          {/* ========= DOMAIN SIDEBAR ========= */}
          <aside className="w-64 border-r border-white/10 glass-dark overflow-y-auto">
            <div className="sticky top-0 z-10 px-4 h-12 flex items-center text-xs font-bold uppercase text-white/60 border-b border-white/10 glass-dark">
              Control Domains
            </div>

            <div className="p-2 space-y-2">
              <button
                onClick={() => setSelectedDomain(null)}
                className={cn(
                  "w-full text-left px-3 py-3 rounded text-sm font-bold transition",
                  !selectedDomain
                    ? "bg-yellow-400 text-black"
                    : "hover:bg-white/10 text-white"
                )}
              >
                All Domains
                <div className="text-xs opacity-70 mt-1">
                  {framework.totalControls} controls
                </div>
              </button>

              {domains.map(domain => {
                const active = selectedDomain === domain
                const count = framework.controls.filter(
                  c => c.domain === domain
                ).length

                return (
                  <button
                    key={domain}
                    onClick={() => setSelectedDomain(domain)}
                    className={cn(
                      "w-full text-left px-3 py-3 rounded text-sm font-bold transition",
                      active
                        ? "bg-yellow-400 text-black"
                        : "hover:bg-white/10 text-white"
                    )}
                  >
                    {domain}
                    <div className="text-xs opacity-70 mt-1">
                      {count} controls
                    </div>
                  </button>
                )
              })}
            </div>
          </aside>

          {/* ========= MAIN TABLE ========= */}
          <div className="flex-1 overflow-y-auto">

            {/* TABLE HEADER (FIXED) */}
            <div className="sticky top-0 z-10 grid grid-cols-[200px_1fr_120px] h-12 px-4 items-center glass-dark border-b border-white/10">
              <div className="text-sm font-bold text-white">Control ID</div>
              <div className="text-sm font-bold text-white">Control Details</div>
              <div className="text-sm font-bold text-white text-right">Actions</div>
            </div>

            {filteredControls.map(control => (
              <ControlRow
                key={control.id}
                control={control}
                availableApplicabilities={framework.availableApplicabilities}
                isEditing={editingControl === control.id}
                onEditClick={() =>
                  setEditingControl(
                    editingControl === control.id ? null : control.id
                  )
                }
                onMetadataChange={handleMetadataChange}
                onApplicabilityToggle={handleApplicabilityToggle}
                isPending={isPending}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ================= CONTROL ROW ================= */

function ControlRow({
  control,
  availableApplicabilities,
  isEditing,
  onEditClick,
  onMetadataChange,
  onApplicabilityToggle,
  isPending,
}: any) {
  return (
    <div className="border-b border-white/10 hover:bg-white/5 transition">
      <div className="grid grid-cols-[200px_1fr_120px] px-4 py-4">
        <div className="text-sm font-bold text-white">
          {control.controlCode}
        </div>

        <div className="text-sm text-white/70 space-y-2">
          <p>{control.statement}</p>

          {isEditing && (
            <div className="pt-3 border-t border-white/10 space-y-4">
              {/* CONTROL TYPE */}
              <div>
                <div className="text-xs font-bold text-white/60 mb-2">
                  Control Type
                </div>
                {["Preventive", "Detective", "Corrective"].map(type => (
                  <label key={type} className="flex gap-2 text-sm text-white/70">
                    <input
                      type="checkbox"
                      checked={control.controlType === type}
                      onChange={e =>
                        onMetadataChange(
                          control.id,
                          "controlType",
                          e.target.checked ? type : null
                        )
                      }
                      disabled={isPending}
                    />
                    {type}
                  </label>
                ))}
              </div>

              {/* CONTROL SCOPE */}
              <div>
                <div className="text-xs font-bold text-white/60 mb-2">
                  Control Scope
                </div>
                {["Organization", "Application"].map(scope => (
                  <label key={scope} className="flex gap-2 text-sm text-white/70">
                    <input
                      type="checkbox"
                      checked={control.controlScope === scope}
                      onChange={e =>
                        onMetadataChange(
                          control.id,
                          "controlScope",
                          e.target.checked ? scope : null
                        )
                      }
                      disabled={isPending}
                    />
                    {scope}
                  </label>
                ))}
              </div>

              {/* APPLICABILITY */}
              <div>
                <div className="text-xs font-bold text-white/60 mb-2">
                  Applicability
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {availableApplicabilities.map((cat: any) => (
                    <label
                      key={cat.id}
                      className="flex gap-2 text-sm text-white/70"
                    >
                      <input
                        type="checkbox"
                        checked={control.applicabilityIds.includes(cat.id)}
                        onChange={() =>
                          onApplicabilityToggle(
                            control.id,
                            cat.id,
                            control.applicabilityIds
                          )
                        }
                        disabled={isPending}
                      />
                      {cat.name}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button
            size="sm"
            variant="ghost"
            onClick={onEditClick}
            className="text-white border-white-400 hover:bg-yellow-400 hover:text-black"
          >
            {isEditing ? "Cancel" : "Edit"}
          </Button>
        </div>
      </div>
    </div>
  )
}
