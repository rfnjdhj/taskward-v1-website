import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { TagDistribution } from '@/hooks/useStatisticsData'

const COLORS = [
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff7300',
  '#00C49F',
  '#FFBB28',
  '#FF8042',
  '#0088FE'
]

interface PieChartComponentProps {
  data: TagDistribution[]
  selectedTag: string | null
  onTagClick: (tag: TagDistribution) => void
  highlightedTag?: string | null
}

export default function PieChartComponent({
  data,
  selectedTag,
  onTagClick,
  highlightedTag
}: PieChartComponentProps) {
  const { t } = useTranslation(['statistics'])

  const filteredData = useMemo(() => {
    return data.slice(0, 8)
  }, [data])

  const pieData = useMemo(() => {
    return filteredData.map((tag, index) => ({
      name: tag.tag,
      value: tag.count,
      color: COLORS[index % COLORS.length],
      originalTag: tag
    }))
  }, [filteredData])

  if (filteredData.length === 0) {
    return (
      <div className="card card-bordered bg-base-100 p-4 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold">{t('statistics:CHART.TAG_DISTRIBUTION')}</h2>
        <div className="flex h-[300px] items-center justify-center text-gray-500">
          {t('statistics:TASK_LIST.EMPTY')}
        </div>
      </div>
    )
  }

  return (
    <div className="card card-bordered bg-base-100 p-4 shadow-xl">
      <h2 className="mb-4 text-lg font-semibold">{t('statistics:CHART.TAG_DISTRIBUTION')}</h2>
      <div className="h-[300px]">
        <ResponsiveContainer
          width="100%"
          height="100%"
        >
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              onClick={(data) => onTagClick(data.originalTag)}
              cursor="pointer"
            >
              {pieData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={highlightedTag === entry.originalTag.tag ? '#00C49F' : entry.color}
                  stroke={highlightedTag === entry.originalTag.tag ? '#00C49F' : 'none'}
                  strokeWidth={highlightedTag === entry.originalTag.tag ? 3 : 0}
                />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
