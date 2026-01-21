'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
export const dynamic = "force-dynamic"

interface ComplianceTrendsChartProps {
  data: Array<{ 
    month: string
    score: number
    notMet: number 
  }>
}

export default function ComplianceTrendsChart({ data }: ComplianceTrendsChartProps) {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900 mb-2">{payload[0].payload.month}</p>
          <div className="space-y-1">
            <p className="text-sm text-gray-700">
              <span className="font-medium">Overall Score:</span> {payload[0].value}%
            </p>
            <p className="text-sm text-red-600">
              <span className="font-medium">Not Met:</span> {payload[1].value}
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="month" 
            tick={{ fill: '#6b7280', fontSize: 12 }}
            tickLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis 
            tick={{ fill: '#6b7280', fontSize: 12 }}
            tickLine={{ stroke: '#e5e7eb' }}
            domain={[0, 100]}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="line"
          />
          <Line 
            type="monotone" 
            dataKey="score" 
            stroke="#2563eb" 
            strokeWidth={3}
            name="Overall Score (%)"
            dot={{ fill: '#2563eb', r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line 
            type="monotone" 
            dataKey="notMet" 
            stroke="#ef4444" 
            strokeWidth={2}
            name="Controls Not Met"
            dot={{ fill: '#ef4444', r: 3 }}
            strokeDasharray="5 5"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}