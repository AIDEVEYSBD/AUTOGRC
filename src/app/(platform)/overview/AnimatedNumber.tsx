"use client"
import { useEffect, useState } from "react"
function ringColor(p: number) {
    if (p >= 70) return "#22c55e"
    if (p >= 40) return "#facc15"
    return "#ef4444"
  }
function Donut({
    percent,
    size = 90,
    stroke = 10,
  }: {
    percent: number
    size?: number
    stroke?: number
  }) {
    const radius = (size - stroke) / 2
    const circumference = 2 * Math.PI * radius
    const offset = circumference - (percent / 100) * circumference
  
    return (
      <div className="relative flex items-center justify-center">
        <svg width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255,255,255,0.15)"
            strokeWidth={stroke}
            fill="transparent"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={ringColor(percent)}
            strokeWidth={stroke}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <span className="absolute text-lg font-bold text-white">
          {percent}%
        </span>
      </div>
    )
  }
export function AnimatedNumber({
  value,
  suffix = "",
  className = "",
}: {
  value: number
  suffix?: string
  className?: string
}) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    let start = 0
    const duration = 800
    const stepTime = 16
    const steps = duration / stepTime
    const increment = value / steps

    const interval = setInterval(() => {
      start += increment
      if (start >= value) {
        setDisplay(value)
        clearInterval(interval)
      } else {
        setDisplay(Math.floor(start))
      }
    }, stepTime)

    return () => clearInterval(interval)
  }, [value])

  return (
    <span className={`text-4xl font-bold ${className}`}>
      {display}
      <span className="text-white/40">{suffix}</span>
    </span>
  )
}
