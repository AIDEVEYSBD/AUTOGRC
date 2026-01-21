'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

interface ComplianceTrendsChartProps {
  data: Array<{ 
    month: string
    score: number
  }>
}

export default function ComplianceTrendsChart({ data }: ComplianceTrendsChartProps) {
  // Determine trend color based on last two months
  const getTrendColor = () => {
    if (data.length < 2) return "#2e2e38" // Default dark gray
    
    const lastMonth = data[data.length - 1].score
    const previousMonth = data[data.length - 2].score
    
    if (lastMonth > previousMonth) {
      return "#00a758" // EY Green - improving
    } else if (lastMonth < previousMonth) {
      return "#e41f13" // Red - declining
    } else {
      return "#ffe600" // EY Yellow - stable
    }
  }

  const lineColor = getTrendColor()
  
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const score = payload[0].value
      let trendIndicator = ""
      let trendColor = "#6b7280"
      
      // Show trend indicator in tooltip
      if (payload[0].payload.index > 0 && data[payload[0].payload.index - 1]) {
        const prevScore = data[payload[0].payload.index - 1].score
        if (score > prevScore) {
          trendIndicator = "↑"
          trendColor = "#00a758"
        } else if (score < prevScore) {
          trendIndicator = "↓"
          trendColor = "#e41f13"
        } else {
          trendIndicator = "→"
          trendColor = "#f59e0b"
        }
      }
      
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900 mb-2">{payload[0].payload.month}</p>
          <div className="space-y-1">
            <p className="text-sm text-gray-700 flex items-center gap-2">
              <span className="font-medium">Compliance Score:</span> 
              <span className="font-bold">{score}%</span>
              {trendIndicator && (
                <span style={{ color: trendColor }} className="font-bold text-lg">
                  {trendIndicator}
                </span>
              )}
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  // Add index to data for tooltip trend calculation
  const dataWithIndex = data.map((item, index) => ({ ...item, index }))

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={dataWithIndex}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="month" 
            tick={{ fill: '#2e2e38', fontSize: 12, fontWeight: 500 }}
            tickLine={{ stroke: '#e5e7eb' }}
            axisLine={{ stroke: '#d1d5db' }}
          />
          <YAxis 
            tick={{ fill: '#2e2e38', fontSize: 12, fontWeight: 500 }}
            tickLine={{ stroke: '#e5e7eb' }}
            axisLine={{ stroke: '#d1d5db' }}
            domain={[0, 100]}
            label={{ 
              value: 'Compliance Score (%)', 
              angle: -90, 
              position: 'insideLeft', 
              style: { fill: '#2e2e38', fontSize: 13, fontWeight: 600 } 
            }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#d1d5db', strokeWidth: 1 }} />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="line"
            formatter={(value) => <span className="font-medium text-gray-700">{value}</span>}
          />
          <Line 
            type="monotone" 
            dataKey="score" 
            stroke={lineColor}
            strokeWidth={3}
            name="Compliance Score (%)"
            dot={{ fill: lineColor, r: 5, strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 7, strokeWidth: 2, stroke: '#fff' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}