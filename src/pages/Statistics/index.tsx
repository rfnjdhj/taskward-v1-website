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
import { useWebWorkerStatistics } from '@/hooks/useWebWorkerStatistics'
import {
  StatisticsData,
  TagDistribution,
  DailyCompletedTasks,
  filterTasksByPriority,
  sortTasksByDate,
  searchTasks,
  getPriorityLabel,
  flattenTasks,
  calculateDailyCompleted,
  filterDailyCompletedByTag,
  calculateTagDistribution,
  calculatePriorityDistribution,
  filterTasksByDate
} from '@/utils/statistics'
import { Note as NoteType, Task as TaskType } from '@/interfaces'

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
  const {
    calculateStatisticsAsync,
    filterDailyCompletedByTagAsync,
    isLoading: workerLoading,
    error: workerError
  } = useWebWorkerStatistics()

  const [dateRangeType, setDateRangeType] = useState<DateRangeType>('last30')
  const [customDateRange, setCustomDateRange] = useState<{ start: string; end: string }>({
    start: dayjs().subtract(29, 'day').format('YYYY-MM-DD'),
    end: dayjs().format('YYYY-MM-DD')
  })
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
  const [statistics, setStatistics] = useState<StatisticsData>({
    dailyCompleted: [],
    priorityDistribution: {
      high: 0,
      medium: 0,
      low: 0,
      highTasks: [],
      mediumTasks: [],
      lowTasks: []
    },
    tagDistribution: [],
    totalTasks: 0,
    completedTasks: 0,
    incompleteTasks: 0
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

  // Calculate statistics using Web Worker
  useEffect(() => {
    if (notesData?.notes) {
      calculateStatisticsAsync(notesData.notes, dateRange)
        .then((result) => {
          setStatistics(result)
        })
        .catch((error) => {
          console.error('Failed to calculate statistics:', error)
          showNotification(false, t('statistics:ERROR.CALCULATION_FAILED'))
        })
    }
  }, [notesData?.notes, dateRange])

  const [filteredDailyCompleted, setFilteredDailyCompleted] = useState(statistics.dailyCompleted)

  // 处理标签过滤 - 使用Web Worker计算
  useEffect(() => {
    if (selectedTag && notesData?.notes) {
      filterDailyCompletedByTagAsync(statistics.dailyCompleted, selectedTag.tag, notesData.notes)
        .then((filtered) => {
          setFilteredDailyCompleted(filtered)
        })
        .catch((error) => {
          console.error('Failed to filter daily completed by tag:', error)
          showNotification(false, t('statistics:ERROR.CALCULATION_FAILED'))
        })
    } else if (selectedDate) {
      // 如果选中了日期，只显示当天的数据
      const selectedDayData = statistics.dailyCompleted.find((d) => d.date === selectedDate)
      setFilteredDailyCompleted(selectedDayData ? [selectedDayData] : [])
    } else {
      // 没有选中任何过滤器，显示所有数据
      setFilteredDailyCompleted(statistics.dailyCompleted)
    }
  }, [
    selectedTag,
    selectedDate,
    statistics.dailyCompleted,
    notesData?.notes,
    filterDailyCompletedByTagAsync
  ])

  const filteredTagDistribution = useMemo(() => {
    return statistics.tagDistribution.slice(0, 8)
  }, [statistics.tagDistribution])

  const filteredPriorityDistribution = useMemo(() => {
    return statistics.priorityDistribution
  }, [statistics.priorityDistribution])

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
        value: filteredPriorityDistribution.high,
        priority: 'high' as PriorityType,
        fill: '#ef4444'
      },
      {
        name: t('statistics:PRIORITY.MEDIUM'),
        value: filteredPriorityDistribution.medium,
        priority: 'medium' as PriorityType,
        fill: '#f59e0b'
      },
      {
        name: t('statistics:PRIORITY.LOW'),
        value: filteredPriorityDistribution.low,
        priority: 'low' as PriorityType,
        fill: '#22c55e'
      }
    ]
  }, [filteredPriorityDistribution, t])

  const TaskListModal = ({
    show,
    onClose,
    title,
    tasks,
    enableSearch = false,
    enablePriorityFilter = false,
    enableSortByDate = false
  }: {
    show: boolean
    onClose: () => void
    title: string
    tasks: TaskType[]
    enableSearch?: boolean
    enablePriorityFilter?: boolean
    enableSortByDate?: boolean
  }) => {
    const [searchTerm, setSearchTerm] = useState('')
    const [priorityFilter, setPriorityFilter] = useState<PriorityType | 'all'>('all')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
    const [sortBy, setSortBy] = useState<'date' | 'none'>('none')

    const filteredAndSortedTasks = useMemo(() => {
      let result = [...tasks]

      // 搜索过滤
      if (searchTerm) {
        result = result.filter((task) =>
          task.content?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      }

      // 优先级过滤
      if (enablePriorityFilter && priorityFilter !== 'all') {
        result = filterTasksByPriority(result, priorityFilter)
      }

      // 按日期排序
      if (enableSortByDate && sortBy === 'date') {
        result = sortTasksByDate(result, sortOrder)
      }

      return result
    }, [tasks, searchTerm, priorityFilter, sortOrder, sortBy])

    const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const task = filteredAndSortedTasks[index]
      return (
        <div
          style={style}
          className="flex items-center border-b border-base-300 px-4 dark:border-gray-700"
        >
          <div className="flex flex-1 flex-col">
            <span className="truncate text-sm text-gray-700 dark:text-gray-300">
              {task.content || t('statistics:TASK_LIST.EMPTY')}
            </span>
            {task.finishedAt && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {dayjs(task.finishedAt).format('YYYY-MM-DD HH:mm')}
              </span>
            )}
          </div>
          {task.priority && (
            <span
              className={`badge badge-xs ${
                task.priority === 'high'
                  ? 'badge-error'
                  : task.priority === 'medium'
                    ? 'badge-warning'
                    : 'badge-success'
              }`}
            >
              {getPriorityLabel(task.priority)}
            </span>
          )}
        </div>
      )
    }

    if (!show) return null

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

          {/* 搜索和筛选区域 */}
          <div className="space-y-2 border-b border-base-300 p-4 dark:border-gray-700">
            {enableSearch && (
              <input
                type="text"
                placeholder={t('statistics:TASK_LIST.SEARCH') || 'Search tasks...'}
                className="input input-bordered input-sm w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            )}

            <div className="flex flex-wrap gap-2">
              {enablePriorityFilter && (
                <select
                  className="select select-bordered select-sm"
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value as PriorityType | 'all')}
                >
                  <option value="all">
                    {t('statistics:TASK_LIST.ALL_PRIORITIES') || 'All priorities'}
                  </option>
                  <option value="high">{t('statistics:PRIORITY.HIGH')}</option>
                  <option value="medium">{t('statistics:PRIORITY.MEDIUM')}</option>
                  <option value="low">{t('statistics:PRIORITY.LOW')}</option>
                </select>
              )}

              {enableSortByDate && (
                <select
                  className="select select-bordered select-sm"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'none')}
                >
                  <option value="none">{t('statistics:TASK_LIST.NO_SORT') || 'No sort'}</option>
                  <option value="date">
                    {t('statistics:TASK_LIST.SORT_BY_DATE') || 'Sort by date'}
                  </option>
                </select>
              )}

              {enableSortByDate && sortBy === 'date' && (
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  {sortOrder === 'desc' ? '↓' : '↑'}
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            {filteredAndSortedTasks.length > 0 ? (
              <FixedSizeList
                height={400}
                width="100%"
                itemCount={filteredAndSortedTasks.length}
                itemSize={60}
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
              onChange={(e) => setDateRangeType(e.target.value as DateRangeType)}
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
                  onChange={(e) =>
                    setCustomDateRange({ ...customDateRange, start: e.target.value })
                  }
                />
                <input
                  type="date"
                  className="input input-bordered input-sm flex-1"
                  value={customDateRange.end}
                  onChange={(e) => setCustomDateRange({ ...customDateRange, end: e.target.value })}
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
            <h2 className="mb-4 text-lg font-semibold">
              {t('statistics:CHART.COMPLETED_TREND')}
              {selectedTag && <span className="badge badge-primary ml-2">{selectedTag.tag}</span>}
            </h2>
            <div className="h-[300px]">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <LineChart data={filteredDailyCompleted}>
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
                    stroke={selectedTag ? COLORS[0] : '#8884d8'}
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
        enablePriorityFilter={true}
        enableSortByDate={true}
      />

      <TaskListModal
        show={showPriorityModal}
        onClose={() => setShowPriorityModal(false)}
        title={t('statistics:TASK_LIST.FILTERED_BY_PRIORITY', {
          priority: getPriorityLabel(selectedPriority || 'high')
        })}
        tasks={priorityTasks}
        enableSearch={true}
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
