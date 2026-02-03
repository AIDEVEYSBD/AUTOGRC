'use client'

import React, { useState } from 'react'

// Benefit component
function Benefit({ title }: { title: string }) {
  return (
    <div
      className="
        glass-dark
        p-6 md:p-8
        rounded-2xl
        transition-all duration-300 ease-out
        hover:bg-white/15
        hover:border-yellow-400/60
        hover:shadow-[0_0_0_1px_rgba(250,204,21,0.4),0_20px_60px_rgba(250,204,21,0.15)]
        hover:-translate-y-1
      "
    >
      <h3 className="text-lg md:text-xl font-bold mb-2 hover:text-yellow-400">{title}</h3>
      
    </div>
  )
}

// FlipCard Props
interface FlipCardProps {
  frontTitle: string
  frontContent: string
  backTitle: string
  backContent: string[] | React.ReactNode
}

// FlipCard Component
export function FlipCard({
  frontTitle,
  frontContent,
  backTitle,
  backContent,
}: FlipCardProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const cardHeight = "h-[32rem]" // Fixed height for front and back

  return (
    <div
      className="flip-card-container w-full max-w-6xl mx-auto cursor-pointer"
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div className={`flip-card ${isFlipped ? 'flipped' : ''}`}>
        {/* FRONT */}
        <div className="flip-card-front">
          <div
            className={`
              glass-dark
              ${cardHeight}
              p-6 md:p-8
              rounded-2xl
              flex flex-col justify-center
              border border-white/10
              transition-all duration-300 ease-out
              hover:bg-white/15
              hover:border-yellow-400/60
              hover:shadow-[0_0_0_1px_rgba(250,204,21,0.4),0_24px_70px_rgba(250,204,21,0.18)]
              hover:-translate-y-1
            `}
          >
            <h3 className="text-2xl md:text-3xl font-bold mb-4 text-yellow-400">
              {frontTitle}
            </h3>

            <p className="text-gray-300 text-xl md:text-base leading-relaxed mb-6">
              {frontContent}
            </p>

            <span className="text-yellow-400/70 text-xs md:text-sm font-semibold">
              Click to reveal pain points →
            </span>
          </div>
        </div>

        {/* BACK */}
        <div className="flip-card-back">
          <div
            className={`
              glass-dark
              ${cardHeight}
              p-6 md:p-8
              rounded-2xl
              flex flex-col justify-between
              border border-white/10
              transition-all duration-300 ease-out
              hover:bg-white/15
              hover:border-yellow-400/60
              hover:shadow-[0_0_0_1px_rgba(250,204,21,0.4),0_24px_70px_rgba(250,204,21,0.18)]
              hover:-translate-y-1
            `}
          >
            {/* Title */}
            <h3 className="text-3xl md:text-4xl font-bold text-yellow-400 text-center mb-6">
              {backTitle}
            </h3>

            {/* Content */}
            <div className="grid md:grid-cols-2 gap-6 overflow-y-auto flex-1">
              {Array.isArray(backContent)
                ? backContent.map((point, i) => <Benefit key={i} title={point} />)
                : backContent}
            </div>

            {/* Footer hint */}
            <p className="text-yellow-400/70 text-sm font-semibold text-center mt-6">
              ← Click to go back
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
