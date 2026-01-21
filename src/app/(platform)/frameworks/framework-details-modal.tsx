"use client"

import { useState, useTransition, useEffect } from "react"
import { updateControlMetadata, updateControlApplicabilities, fetchFrameworkDetails } from "./framework-actions"
export const dynamic = "force-dynamic"
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

type FrameworkDetailsModalProps = {
  framework: FrameworkDetails
  onClose: () => void
}

export function FrameworkDetailsModal({ framework: initialFramework, onClose }: FrameworkDetailsModalProps) {
  const [framework, setFramework] = useState(initialFramework)
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null)
  const [editingControl, setEditingControl] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Get unique domains
  const domains = Array.from(new Set(framework.controls.map(c => c.domain))).sort()

  // Filter controls by domain
  const filteredControls = selectedDomain
    ? framework.controls.filter(c => c.domain === selectedDomain)
    : framework.controls

  const handleMetadataChange = async (
    controlId: string,
    field: "controlType" | "controlScope" | "isAutomated",
    value: string | boolean | null
  ) => {
    // Optimistic update
    setFramework(prev => ({
      ...prev,
      controls: prev.controls.map(c =>
        c.id === controlId ? { ...c, [field]: value } : c
      )
    }))

    // Server update
    startTransition(async () => {
      const result = await updateControlMetadata(controlId, {
        [field]: value,
      })
      
      if (result.success) {
        // Refresh data from server
        const refreshed = await fetchFrameworkDetails(framework.id)
        if (refreshed) {
          setFramework(refreshed)
        }
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

    // Optimistic update
    setFramework(prev => ({
      ...prev,
      controls: prev.controls.map(c =>
        c.id === controlId ? { ...c, applicabilityIds: newIds } : c
      )
    }))

    // Server update
    startTransition(async () => {
      const result = await updateControlApplicabilities(controlId, newIds)
      
      if (result.success) {
        // Refresh data from server
        const refreshed = await fetchFrameworkDetails(framework.id)
        if (refreshed) {
          setFramework(refreshed)
        }
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-7xl max-h-[90vh] bg-white rounded-lg shadow-xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#cccccc] flex items-center justify-between" style={{ backgroundColor: "#ffe600" }}>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-[#333333]">
                {framework.name}
              </h2>
              {framework.isMaster && (
                <span className="text-xs px-2 py-0.5 rounded bg-white text-[#333333] font-bold border border-[#333333]">
                  MASTER
                </span>
              )}
            </div>
            {framework.version && (
              <p className="text-sm text-[#666666] mt-1">
                Version {framework.version} • {framework.totalControls} controls
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-white transition-colors"
          >
            <svg className="w-5 h-5 text-[#333333]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex">
          {/* Sidebar - Domain filter */}
          <aside className="w-64 border-r border-[#cccccc] bg-[#f9f9f9] overflow-y-auto">
            <div
              className="h-12 px-4 flex items-center text-sm font-bold uppercase tracking-wider text-[#333333] border-b border-[#cccccc]"
              style={{ backgroundColor: "#ffe600" }}
            >
              Control Domains
            </div>
            <div className="p-2 space-y-2">
              <button
                onClick={() => setSelectedDomain(null)}
                className={[
                  "w-full text-left px-3 py-3 rounded transition-colors text-sm font-bold",
                  !selectedDomain
                    ? "bg-[#ffe600] text-[#333333] shadow-sm"
                    : "bg-[#2e2e38] hover:bg-[#3e3e48] text-white",
                ].join(" ")}
              >
                All Domains
                <div className={`text-xs mt-1 ${!selectedDomain ? "text-[#666666]" : "text-[#cccccc]"}`}>
                  {framework.totalControls} controls
                </div>
              </button>
              {domains.map(domain => {
                const count = framework.controls.filter(c => c.domain === domain).length
                const active = selectedDomain === domain
                return (
                  <button
                    key={domain}
                    onClick={() => setSelectedDomain(domain)}
                    className={[
                      "w-full text-left px-3 py-3 rounded transition-colors text-sm font-bold",
                      active
                        ? "bg-[#ffe600] text-[#333333] shadow-sm"
                        : "bg-[#2e2e38] hover:bg-[#3e3e48] text-white",
                    ].join(" ")}
                  >
                    {domain}
                    <div className={`text-xs mt-1 ${active ? "text-[#666666]" : "text-[#cccccc]"}`}>
                      {count} controls
                    </div>
                  </button>
                )
              })}
            </div>
          </aside>

          {/* Main content - Table format */}
          <div className="flex-1 overflow-y-auto bg-white">
            <div className="border-b border-[#cccccc]" style={{ backgroundColor: "#ffe600" }}>
              <div className="grid grid-cols-[200px_1fr_120px] h-12 items-center px-4">
                <div className="text-sm font-bold text-[#333333]">Control ID</div>
                <div className="text-sm font-bold text-[#333333]">Control Details</div>
                <div className="text-sm font-bold text-[#333333] text-right">Actions</div>
              </div>
            </div>

            {filteredControls.length === 0 ? (
              <div className="p-6 text-sm text-[#666666]">
                No controls found for this domain.
              </div>
            ) : (
              filteredControls.map(control => (
                <ControlRow
                  key={control.id}
                  control={control}
                  availableApplicabilities={framework.availableApplicabilities}
                  isEditing={editingControl === control.id}
                  onEditClick={() => setEditingControl(editingControl === control.id ? null : control.id)}
                  onMetadataChange={handleMetadataChange}
                  onApplicabilityToggle={handleApplicabilityToggle}
                  isPending={isPending}
                />
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#cccccc] flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-[#ffe600] text-[#333333] rounded font-semibold hover:bg-[#ffd700] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function ControlRow({
  control,
  availableApplicabilities,
  isEditing,
  onEditClick,
  onMetadataChange,
  onApplicabilityToggle,
  isPending,
}: {
  control: FrameworkDetailsControl
  availableApplicabilities: { id: string; code: string; name: string; description: string | null }[]
  isEditing: boolean
  onEditClick: () => void
  onMetadataChange: (controlId: string, field: "controlType" | "controlScope" | "isAutomated", value: string | boolean | null) => void
  onApplicabilityToggle: (controlId: string, applicabilityId: string, currentIds: string[]) => void
  isPending: boolean
}) {
  return (
    <div className="border-b border-[#e5e7eb] last:border-b-0 hover:bg-[#f9f9f9] transition-colors">
      <div className="grid grid-cols-[200px_1fr_120px] px-4 py-4">
        {/* Control ID column */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-bold text-[#333333]">{control.controlCode}</span>
            {control.isAutomated && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Auto
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {control.controlType && (
              <span className={[
                "px-2 py-0.5 rounded text-xs font-medium",
                control.controlType === "Preventive" ? "bg-green-100 text-green-700" :
                control.controlType === "Detective" ? "bg-yellow-100 text-yellow-700" :
                "bg-purple-100 text-purple-700"
              ].join(" ")}>
                {control.controlType}
              </span>
            )}
            {control.controlScope && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                {control.controlScope}
              </span>
            )}
            {control.subDomain && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                {control.subDomain}
              </span>
            )}
          </div>
        </div>

        {/* Control details column */}
        <div>
          <p className="text-sm text-[#666666] leading-relaxed mb-2">
            {control.statement}
          </p>

          {control.testingProcedure && (
            <div className="mb-2">
              <p className="text-xs font-semibold text-[#333333] mb-1">Testing Procedure:</p>
              <p className="text-xs text-[#666666] leading-relaxed">
                {control.testingProcedure}
              </p>
            </div>
          )}

          {/* Applicability badges */}
          {control.applicabilityIds.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {control.applicabilityIds.map(id => {
                const cat = availableApplicabilities.find(a => a.id === id)
                return cat ? (
                  <span
                    key={id}
                    className="px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700"
                  >
                    {cat.name}
                  </span>
                ) : null
              })}
            </div>
          )}

          {/* Edit mode */}
          {isEditing && (
            <div className="mt-3 pt-3 border-t border-[#e5e7eb] space-y-3">
              {/* Control Type */}
              <div>
                <label className="block text-xs font-semibold text-[#333333] mb-2">
                  Control Type
                </label>
                <div className="flex gap-3">
                  {["Preventive", "Detective", "Corrective"].map(type => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={control.controlType === type}
                        onChange={(e) => {
                          onMetadataChange(
                            control.id,
                            "controlType",
                            e.target.checked ? type : null
                          )
                        }}
                        disabled={isPending}
                        className="rounded border-gray-300 text-[#ffe600] focus:ring-[#ffe600]"
                      />
                      <span className="text-xs text-[#666666]">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Control Scope */}
              <div>
                <label className="block text-xs font-semibold text-[#333333] mb-2">
                  Control Scope
                </label>
                <div className="flex gap-3">
                  {["Organization", "Application"].map(scope => (
                    <label key={scope} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={control.controlScope === scope}
                        onChange={(e) => {
                          onMetadataChange(
                            control.id,
                            "controlScope",
                            e.target.checked ? scope : null
                          )
                        }}
                        disabled={isPending}
                        className="rounded border-gray-300 text-[#ffe600] focus:ring-[#ffe600]"
                      />
                      <span className="text-xs text-[#666666]">{scope}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Automated */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={control.isAutomated ?? false}
                    onChange={(e) => {
                      onMetadataChange(
                        control.id,
                        "isAutomated",
                        e.target.checked
                      )
                    }}
                    disabled={isPending}
                    className="rounded border-gray-300 text-[#ffe600] focus:ring-[#ffe600]"
                  />
                  <span className="text-xs font-semibold text-[#333333]">
                    Automated Control
                  </span>
                </label>
              </div>

              {/* Applicability Categories */}
              <div>
                <label className="block text-xs font-semibold text-[#333333] mb-2">
                  Applicability Categories
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {availableApplicabilities.map(cat => (
                    <label
                      key={cat.id}
                      className="flex items-start gap-2 cursor-pointer p-2 rounded hover:bg-[#f9f9f9] transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={control.applicabilityIds.includes(cat.id)}
                        onChange={() => {
                          onApplicabilityToggle(control.id, cat.id, control.applicabilityIds)
                        }}
                        disabled={isPending}
                        className="mt-0.5 rounded border-gray-300 text-[#ffe600] focus:ring-[#ffe600]"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-[#333333]">{cat.name}</div>
                        {cat.description && (
                          <div className="text-xs text-[#999999] line-clamp-2">{cat.description}</div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions column */}
        <div className="flex justify-end">
          <button
            onClick={onEditClick}
            className="px-3 py-1.5 text-xs font-medium rounded border border-[#cccccc] hover:bg-[#f9f9f9] transition-colors"
          >
            {isEditing ? "Cancel" : "Edit"}
          </button>
        </div>
      </div>
    </div>
  )
}