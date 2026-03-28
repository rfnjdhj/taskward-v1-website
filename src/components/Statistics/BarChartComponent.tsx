import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { PriorityDistribution } from '@/hooks/useStatisticsData'

type PriorityType = 'high' | 'medium' | 'low'

interface BarChartComponentProps {
  data: PriorityDistribution
  selectedPriority: PriorityType | null
  onPriorityClick: (priority: PriorityType) => void
}

export default function BarChartComponent({
  data,
  selectedPriority,
  onPriorityClick
}: BarChartComponentProps) {
  const { t } = useTranslation(['statistics'])

  const barData = useMemo(() => {
    return [
      {
        name: t('statistics:PRIORITY.HIGH'),
        value: data.high,
        priority: 'high' as PriorityType,
        fill: '#ef4444'
      },
      {
        name: t('statistics:PRIORITY.MEDIUM'),
        value: data.medium,
        priority: 'medium' as PriorityType,
        fill: '#f59e0b'
      },
      {
        name: t('statistics:PRIORITY.LOW'),
        value: data.low,
        priority: 'low' as PriorityType,
        fill: '#22c55e'
      }
    ]
  }, [data, t])

  return (
    <div className="card card-bordered bg-base-100 p-4 shadow-xl">
      <h2 className="mb-4 text-lg font-semibold">{t('statistics:CHART.PRIORITY_DISTRIBUTION')}</h2>
      <div className="h-[300px]">
        <ResponsiveContainer
          width="100%"
          height="100%"
        >
          <BarChart
            data={barData}
            layout="vertical"
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              allowDecimals={false}
            />
            <YAxis
              dataKey="name"
              type="category"
              width={80}
            />
            <Tooltip formatter={(value: number) => [value, t('statistics:CHART.TASK_COUNT')]} />
            <Bar
              dataKey="value"
              cursor="pointer"
              onClick={(data) => onPriorityClick((data as { priority: PriorityType }).priority)}
            >
              {barData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={selectedPriority === entry.priority ? '#00C49F' : entry.fill}
                  stroke={selectedPriority === entry.priority ? '#00C49F' : 'none'}
                  strokeWidth={selectedPriority === entry.priority ? 3 : 0}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
