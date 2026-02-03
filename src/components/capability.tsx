'use client'

import { useState } from "react"

interface CapabilityProps {
  number: string
  title: string
  description?: string
  keyFeatures: string[]
  businessOutcomes: string[]
}

export  function Capability({
  number,
  title,
  description,
  keyFeatures,
  businessOutcomes,
}: CapabilityProps) {
  const [open, setOpen] = useState<string | null>(null)

  const toggle = (section: string) => {
    setOpen(open === section ? null : section)
  }

  return (
    <div
      className="glass-dark p-8 rounded-2xl
      flex flex-col gap-6
      border border-white/10
      transition-all duration-300 ease-out
      hover:bg-white/15
      hover:border-yellow-400/60
      hover:shadow-[0_0_0_1px_rgba(250,204,21,0.4),0_24px_70px_rgba(250,204,21,0.18)]
      hover:-translate-y-1"
    >
      {/* Header */}
      <div className="flex gap-6 items-start">
        <span className="text-5xl font-bold text-white">{number}</span>
        <div>
          <h3 className="text-2xl font-bold mb-2">{title}</h3>
          {description && (
            <p className="text-gray-300">{description}</p>
          )}
        </div>
      </div>

      {/* Accordion */}
      <div className="space-y-4 mt-4">

        {/* Key Features */}
        <AccordionSection
          title="Key Features"
          isOpen={open === "features"}
          onClick={() => toggle("features")}
          items={keyFeatures}
        />

        {/* Business Outcomes */}
        <AccordionSection
          title="Business Outcomes"
          isOpen={open === "outcomes"}
          onClick={() => toggle("outcomes")}
          items={businessOutcomes}
        />

      </div>
    </div>
  )
}

/* ---------- Reusable Accordion Section ---------- */

function AccordionSection({
  title,
  items,
  isOpen,
  onClick,
}: {
  title: string
  items: string[]
  isOpen: boolean
  onClick: () => void
}) {
  return (
    <div>
      <button
        onClick={onClick}
        className="w-full flex justify-between items-center text-left text-xl font-semibold"
      >
        <span>{title}</span>
        <span
          className={`transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          ▼
        </span>
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ${
          isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <ul className="mt-3 space-y-2 text-gray-300 list-disc list-inside">
          {items.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
