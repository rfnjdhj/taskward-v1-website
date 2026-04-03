import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import dayjs, { Dayjs } from 'dayjs'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts'
import { FixedSizeList } from 'react-window'
import html2canvas from 'html2canvas'

import { Loading } from '@/components'
import { getDocumentTitle } from '@/utils'
import { useAppDispatch } from '@/hooks'
import { sidebarAction, ActiveSidebarItem } from '@/store'
import { useGetNotesRequest } from '@/requests'
import { useStatisticsData, TagDistribution, DailyCompletedTasks } from '@/hooks/useStatisticsData'
import { Note as NoteType, Task as TaskType } from '@/interfaces'

const COLORS = [
  'var(--chart-pie-1)',
  'var(--chart-pie-2)',
  'var(--chart-pie-3)',
  'var(--chart-pie-4)',
  'var(--chart-pie-5)',
  'var(--chart-pie-6)',
  'var(--chart-pie-7)',
  'var(--chart-pie-8)'
]

type DateRangeType = 'last7' | 'last30' | 'custom'
type PriorityType = 'high' | 'medium' | 'low'

interface SelectedTaskFilter {
  type: 'tag' | 'priority' | 'none'
  value: string | PriorityType | null
  tasks: TaskType[]
}

export default function Statistics(): JSX.Element {
  const { t, i18n } = useTranslation(['common', 'layout', 'statistics'])
  const sidebarDispatch = useAppDispatch()
  const chartRef = useRef<HTMLDivElement>(null)

  const { data: notesData, isLoading, refetch, isRefetching } = useGetNotesRequest()

  const [dateRangeType, setDateRangeType] = useState<DateRangeType>('last30')
  const [customDateRange, setCustomDateRange] = useState<{ start: string; end: string }>({
    start: dayjs().subtract(29, 'day').format('YYYY-MM-DD'),
    end: dayjs().format('YYYY-MM-DD')
  })

  /**
   * 处理日期范围类型变化
   * @param newType 新的日期范围类型
   */
  const handleDateRangeTypeChange = useCallback((newType: DateRangeType) => {
    setDateRangeType(newType)
  }, [])

  /**
   * 处理自定义日期范围变化
   * @param field 要更新的字段（start 或 end）
   * @param value 新的日期值
   */
  const handleCustomDateChange = useCallback((field: 'start' | 'end', value: string) => {
    setCustomDateRange((prev) => ({
      ...prev,
      [field]: value
    }))
  }, [])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTag, setSelectedTag] = useState<TagDistribution | null>(null)
  const [selectedPriority, setSelectedPriority] = useState<PriorityType | null>(null)
  const [showTagModal, setShowTagModal] = useState(false)
  const [showPriorityModal, setShowPriorityModal] = useState(false)
  const [notification, setNotification] = useState<{
    show: boolean
    success: boolean
    message: string
  }>({
    show: false,
    success: false,
    message: ''
  })

  const dateRange = useMemo(() => {
    if (dateRangeType === 'last7') {
      return { start: dayjs().subtract(6, 'day'), end: dayjs() }
    }
    if (dateRangeType === 'last30') {
      return { start: dayjs().subtract(29, 'day'), end: dayjs() }
    }
    return { start: dayjs(customDateRange.start), end: dayjs(customDateRange.end) }
  }, [dateRangeType, customDateRange])

  const statistics = useStatisticsData(notesData?.notes, dateRange)

  const filteredDailyCompleted = useMemo(() => {
    if (!selectedDate) return statistics.dailyCompleted
    const selectedDayData = statistics.dailyCompleted.find((d) => d.date === selectedDate)
    return selectedDayData ? [selectedDayData] : []
  }, [statistics.dailyCompleted, selectedDate])

  const filteredTagDistribution = useMemo(() => {
    return statistics.tagDistribution.slice(0, 8)
  }, [statistics.tagDistribution])

  const selectedTasksForTag = useMemo(() => {
    if (!selectedTag) return []
    return selectedTag.tasks
  }, [selectedTag])

  const priorityTasks = useMemo(() => {
    if (selectedPriority === 'high') return statistics.priorityDistribution.highTasks
    if (selectedPriority === 'medium') return statistics.priorityDistribution.mediumTasks
    if (selectedPriority === 'low') return statistics.priorityDistribution.lowTasks
    return []
  }, [selectedPriority, statistics.priorityDistribution])

  useEffect(() => {
    document.title = getDocumentTitle(t('statistics:TITLE'))
  }, [i18n.language, t])

  useEffect(() => {
    sidebarDispatch(sidebarAction.changeActiveSidebarItem(ActiveSidebarItem.Statistics))
  }, [])

  const showNotification = useCallback((success: boolean, message: string) => {
    setNotification({ show: true, success, message })
    setTimeout(() => setNotification({ show: false, success: false, message: '' }), 3000)
  }, [])

  const handleExportImage = useCallback(async () => {
    if (!chartRef.current) return
    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: document.documentElement.classList.contains('dark') ? '#1a1a2e' : '#ffffff'
      })
      const link = document.createElement('a')
      link.download = `statistics-${dayjs().format('YYYY-MM-DD')}.png`
      link.href = canvas.toDataURL()
      link.click()
      showNotification(true, t('statistics:EXPORT.SUCCESS'))
    } catch {
      showNotification(false, t('statistics:EXPORT.FAILED'))
    }
  }, [showNotification, t])

  const handleExportCSV = useCallback(() => {
    const rows: string[][] = []
    rows.push([
      t('statistics:CHART.LABEL') || 'Completed Tasks',
      t('statistics:DATE') || 'Date',
      'Count'
    ])
    statistics.dailyCompleted.forEach((day) => {
      rows.push(['', day.date, String(day.count)])
    })
    rows.push([])
    rows.push([t('statistics:CHART.PRIORITY_DISTRIBUTION') || 'Priority Distribution'])
    rows.push([
      t('statistics:PRIORITY.HIGH') || 'High',
      String(statistics.priorityDistribution.high)
    ])
    rows.push([
      t('statistics:PRIORITY.MEDIUM') || 'Medium',
      String(statistics.priorityDistribution.medium)
    ])
    rows.push([t('statistics:PRIORITY.LOW') || 'Low', String(statistics.priorityDistribution.low)])
    rows.push([])
    rows.push([t('statistics:CHART.TAG_DISTRIBUTION') || 'Tag Distribution'])
    statistics.tagDistribution.forEach((tag) => {
      rows.push([tag.tag, String(tag.count)])
    })

    const csvContent = rows.map((e) => e.join(',')).join('\n')
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `statistics-${dayjs().format('YYYY-MM-DD')}.csv`
    link.click()
    showNotification(true, t('statistics:EXPORT.SUCCESS'))
  }, [statistics, showNotification, t])

  const handleLineClick = useCallback(
    (data: DailyCompletedTasks | null) => {
      if (data) {
        setSelectedDate(selectedDate === data.date ? null : data.date)
      }
    },
    [selectedDate]
  )

  const handlePieClick = useCallback((data: TagDistribution) => {
    setSelectedTag(data)
    setShowTagModal(true)
  }, [])

  const handleBarClick = useCallback((priority: PriorityType) => {
    setSelectedPriority(priority)
    setShowPriorityModal(true)
  }, [])

  const getPriorityLabel = (priority: PriorityType) => {
    if (priority === 'high') return t('statistics:PRIORITY.HIGH')
    if (priority === 'medium') return t('statistics:PRIORITY.MEDIUM')
    return t('statistics:PRIORITY.LOW')
  }

  const pieData = useMemo(() => {
    return filteredTagDistribution.map((tag, index) => ({
      name: tag.tag,
      value: tag.count,
      color: COLORS[index % COLORS.length],
      originalTag: tag
    }))
  }, [filteredTagDistribution])

  const barData = useMemo(() => {
    return [
      {
        name: t('statistics:PRIORITY.HIGH'),
        value: statistics.priorityDistribution.high,
        priority: 'high' as PriorityType,
        fill: 'var(--chart-bar-high)'
      },
      {
        name: t('statistics:PRIORITY.MEDIUM'),
        value: statistics.priorityDistribution.medium,
        priority: 'medium' as PriorityType,
        fill: 'var(--chart-bar-medium)'
      },
      {
        name: t('statistics:PRIORITY.LOW'),
        value: statistics.priorityDistribution.low,
        priority: 'low' as PriorityType,
        fill: 'var(--chart-bar-low)'
      }
    ]
  }, [statistics.priorityDistribution, t])

  const TaskListModal = ({
    show,
    onClose,
    title,
    tasks
  }: {
    show: boolean
    onClose: () => void
    title: string
    tasks: TaskType[]
  }) => {
    if (!show) return null

    const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const task = tasks[index]
      return (
        <div
          style={style}
          className="flex items-center border-b border-base-300 px-4 dark:border-gray-700"
        >
          <span className="truncate text-sm text-gray-700 dark:text-gray-300">
            {task.content || t('statistics:TASK_LIST.EMPTY')}
          </span>
        </div>
      )
    }

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
        onClick={onClose}
      >
        <div
          className="flex max-h-[80vh] w-full max-w-md flex-col rounded-lg bg-white shadow-xl dark:bg-gray-800"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-base-300 p-4 dark:border-gray-700">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button
              className="btn btn-sm btn-circle btn-ghost"
              onClick={onClose}
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            {tasks.length > 0 ? (
              <FixedSizeList
                height={400}
                width="100%"
                itemCount={tasks.length}
                itemSize={50}
              >
                {Row}
              </FixedSizeList>
            ) : (
              <div className="flex h-40 items-center justify-center text-gray-500">
                {t('statistics:TASK_LIST.EMPTY')}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (isLoading || isRefetching) {
    return (
      <div className="h-screen">
        <Loading />
      </div>
    )
  }

  return (
    <div className="relative flex h-full w-auto flex-col overflow-y-auto">
      <div className="mx-auto mb-80 w-full max-w-7xl p-4">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('statistics:TITLE')}</h1>
          <div className="flex gap-2">
            <button
              className="btn btn-sm btn-outline gap-2"
              onClick={() => refetch()}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={isRefetching ? 'animate-spin' : ''}
              >
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
              {t('statistics:REFRESH')}
            </button>
            <button
              className="btn btn-sm btn-outline gap-2"
              onClick={handleExportImage}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect
                  width="20"
                  height="16"
                  x="2"
                  y="4"
                  rx="2"
                />
                <circle
                  cx="12"
                  cy="10"
                  r="4"
                />
                <circle
                  cx="18"
                  cy="6"
                  r="1.4"
                />
              </svg>
              {t('statistics:EXPORT.IMAGE')}
            </button>
            <button
              className="btn btn-sm btn-outline gap-2"
              onClick={handleExportCSV}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14,2 14,8 20,8" />
                <line
                  x1="12"
                  y1="18"
                  x2="12"
                  y2="12"
                />
                <line
                  x1="9"
                  y1="15"
                  x2="15"
                  y2="15"
                />
              </svg>
              {t('statistics:EXPORT.CSV')}
            </button>
          </div>
        </div>

        <div className="mb-4">
          <div className="form-control w-full max-w-xs">
            <label className="label">
              <span className="label-text font-medium">{t('statistics:DATE_RANGE.SELECT')}</span>
            </label>
            <select
              className="select select-bordered select-sm w-full max-w-xs"
              value={dateRangeType}
              onChange={(e) => handleDateRangeTypeChange(e.target.value as DateRangeType)}
            >
              <option value="last7">{t('statistics:DATE_RANGE.LAST_7_DAYS')}</option>
              <option value="last30">{t('statistics:DATE_RANGE.LAST_30_DAYS')}</option>
              <option value="custom">{t('statistics:DATE_RANGE.CUSTOM')}</option>
            </select>
            {dateRangeType === 'custom' && (
              <div className="mt-2 flex gap-2">
                <input
                  type="date"
                  className="input input-bordered input-sm flex-1"
                  value={customDateRange.start}
                  onChange={(e) => handleCustomDateChange('start', e.target.value)}
                />
                <input
                  type="date"
                  className="input input-bordered input-sm flex-1"
                  value={customDateRange.end}
                  onChange={(e) => handleCustomDateChange('end', e.target.value)}
                />
              </div>
            )}
          </div>
          {selectedDate && (
            <div className="mt-2">
              <span className="badge badge-info gap-2">
                {t('statistics:FILTER.BY_DATE', { date: selectedDate })}
                <button
                  className="ml-1"
                  onClick={() => setSelectedDate(null)}
                >
                  ✕
                </button>
              </span>
            </div>
          )}
        </div>

        <div
          ref={chartRef}
          className="grid grid-cols-1 gap-6 lg:grid-cols-2"
        >
          <div className="card card-bordered bg-base-100 p-4 shadow-xl lg:col-span-2">
            <h2 className="mb-4 text-lg font-semibold">{t('statistics:CHART.COMPLETED_TREND')}</h2>
            <div className="h-[300px]">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <LineChart data={statistics.dailyCompleted}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--chart-grid)"
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12, fill: 'var(--chart-text)' }}
                    tickFormatter={(value) => dayjs(value).format('MM/DD')}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: 'var(--chart-text)' }}
                  />
                  <Tooltip
                    formatter={(value: number) => [value, t('statistics:CHART.LABEL')]}
                    labelFormatter={(label) => t('statistics:CHART.DAY', { count: '', day: label })}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="var(--chart-line)"
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

          <div className="card card-bordered bg-base-100 p-4 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold">{t('statistics:CHART.TAG_DISTRIBUTION')}</h2>
            {pieData.length > 0 ? (
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
                      onClick={(data) => handlePieClick(data.originalTag)}
                      cursor="pointer"
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-gray-500">
                {t('statistics:TASK_LIST.EMPTY')}
              </div>
            )}
          </div>

          <div className="card card-bordered bg-base-100 p-4 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold">
              {t('statistics:CHART.PRIORITY_DISTRIBUTION')}
            </h2>
            <div className="h-[300px]">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={barData}
                  layout="vertical"
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--chart-grid)"
                  />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fill: 'var(--chart-text)' }}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={80}
                    tick={{ fill: 'var(--chart-text)' }}
                  />
                  <Tooltip
                    formatter={(value: number) => [value, t('statistics:CHART.TASK_COUNT')]}
                  />
                  <Bar
                    dataKey="value"
                    cursor="pointer"
                    onClick={(data) =>
                      handleBarClick((data as { priority: PriorityType }).priority)
                    }
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:col-span-2">
            <div className="stat rounded-lg bg-base-100 shadow">
              <div className="stat-figure text-primary">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  className="inline-block h-8 w-8 stroke-current"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  ></path>
                </svg>
              </div>
              <div className="stat-title">{t('statistics:CHART.LABEL')}</div>
              <div className="stat-value text-primary">{statistics.completedTasks}</div>
            </div>
            <div className="stat rounded-lg bg-base-100 shadow">
              <div className="stat-figure text-warning">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  className="inline-block h-8 w-8 stroke-current"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
              </div>
              <div className="stat-title">{t('statistics:CHART.TASK_COUNT')}</div>
              <div className="stat-value text-warning">{statistics.totalTasks}</div>
            </div>
            <div className="stat rounded-lg bg-base-100 shadow">
              <div className="stat-figure text-error">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  className="inline-block h-8 w-8 stroke-current"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  ></path>
                </svg>
              </div>
              <div className="stat-title">{t('statistics:CHART.NO_TAG') || 'Incomplete'}</div>
              <div className="stat-value text-error">{statistics.incompleteTasks}</div>
            </div>
          </div>
        </div>
      </div>

      <TaskListModal
        show={showTagModal}
        onClose={() => setShowTagModal(false)}
        title={t('statistics:TASK_LIST.FILTERED_BY_TAG', { tag: selectedTag?.tag || '' })}
        tasks={selectedTasksForTag}
      />

      <TaskListModal
        show={showPriorityModal}
        onClose={() => setShowPriorityModal(false)}
        title={t('statistics:TASK_LIST.FILTERED_BY_PRIORITY', {
          priority: getPriorityLabel(selectedPriority || 'high')
        })}
        tasks={priorityTasks}
      />

      {notification.show && (
        <div
          className={`toast toast-end z-50 ${notification.success ? 'toast-success' : 'toast-error'}`}
        >
          <div className={`alert ${notification.success ? 'alert-success' : 'alert-error'}`}>
            <span>{notification.message}</span>
          </div>
        </div>
      )}
    </div>
  )
}
