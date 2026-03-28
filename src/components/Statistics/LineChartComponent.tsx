import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'
import { DailyCompletedTasks } from '@/hooks/useStatisticsData'

interface LineChartComponentProps {
  data: DailyCompletedTasks[]
  selectedDate: string | null
  onDateClick: (date: string | null) => void
  highlightedTag?: string | null
}

export default function LineChartComponent({
  data,
  selectedDate,
  onDateClick,
  highlightedTag
}: LineChartComponentProps) {
  const { t } = useTranslation(['statistics'])

  const chartData = useMemo(() => {
    if (!selectedDate) return data
    const selectedDayData = data.find((d) => d.date === selectedDate)
    return selectedDayData ? [selectedDayData] : []
  }, [data, selectedDate])

  const handleLineClick = (data: DailyCompletedTasks | null) => {
    if (data) {
      onDateClick(selectedDate === data.date ? null : data.date)
    }
  }

  return (
    <div className="card card-bordered bg-base-100 p-4 shadow-xl lg:col-span-2">
      <h2 className="mb-4 text-lg font-semibold">
        {t('statistics:CHART.COMPLETED_TREND')}
        {highlightedTag && (
          <span className="ml-2 text-sm text-info">
            - {t('statistics:FILTER.BY_TAG', { tag: highlightedTag })}
          </span>
        )}
      </h2>
      <div className="h-[300px]">
        <ResponsiveContainer
          width="100%"
          height="100%"
        >
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => dayjs(value).format('MM/DD')}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              formatter={(value: number) => [value, t('statistics:CHART.LABEL')]}
              labelFormatter={(label) => t('statistics:CHART.DAY', { count: '', day: label })}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke={highlightedTag ? '#00C49F' : '#8884d8'}
              activeDot={{
                r: 8,
                onClick: (_, payload) =>
                  handleLineClick(payload?.payload as DailyCompletedTasks | null)
              }}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
