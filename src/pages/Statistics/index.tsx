import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import html2canvas from 'html2canvas'

import { Loading } from '@/components'
import { getDocumentTitle } from '@/utils'
import { useAppDispatch } from '@/hooks'
import { sidebarAction, ActiveSidebarItem } from '@/store'
import { useGetNotesRequest } from '@/requests'
import { useStatisticsData, DailyCompletedTasks } from '@/hooks/useStatisticsData'
import {
  LineChartComponent,
  PieChartComponent,
  BarChartComponent,
  TaskListModal
} from '@/components/Statistics'
import {
  selectDateRange,
  selectSelectedDate,
  selectSelectedTag,
  selectSelectedPriority,
  selectSearchTerm,
  selectSortType,
  statisticsAction
} from '@/store/statisticsSlice'
import { useSelector } from 'react-redux'
import { TagDistribution, PriorityType } from '@/utils/statistics'

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

export default function Statistics(): JSX.Element {
  const { t, i18n } = useTranslation(['common', 'layout', 'statistics'])
  const sidebarDispatch = useAppDispatch()
  const chartRef = useRef<HTMLDivElement>(null)

  const { data: notesData, isLoading, refetch, isRefetching } = useGetNotesRequest()

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

  const dateRangeType = useSelector((state) => state.statistics.dateRangeType)
  const customDateRange = useSelector((state) => state.statistics.customDateRange)
  const selectedDate = useSelector(selectSelectedDate)
  const selectedTag = useSelector(selectSelectedTag)
  const selectedPriority = useSelector(selectSelectedPriority)
  const searchTerm = useSelector(selectSearchTerm)
  const sortType = useSelector(selectSortType)
  const dateRange = useSelector(selectDateRange)

  const statistics = useStatisticsData(notesData?.notes)

  const dispatch = useAppDispatch()

  const filteredDailyCompleted = useMemo(() => {
    if (!selectedDate) return statistics.dailyCompleted
    const selectedDayData = statistics.dailyCompleted.find((d) => d.date === selectedDate)
    return selectedDayData ? [selectedDayData] : []
  }, [statistics.dailyCompleted, selectedDate])

  const filteredTagDistribution = useMemo(() => {
    return statistics.tagDistribution.slice(0, 8)
  }, [statistics.tagDistribution])

  const selectedTagData = useMemo(() => {
    if (!selectedTag) return null
    return statistics.tagDistribution.find((t) => t.tag === selectedTag) || null
  }, [selectedTag, statistics.tagDistribution])

  const selectedTasksForTag = useMemo(() => {
    if (!selectedTagData) return []
    return selectedTagData.tasks
  }, [selectedTagData])

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
        dispatch(statisticsAction.setSelectedDate(selectedDate === data.date ? null : data.date))
      }
    },
    [selectedDate, dispatch]
  )

  const handlePieClick = useCallback(
    (data: TagDistribution) => {
      dispatch(statisticsAction.setSelectedTag(data.tag))
      setShowTagModal(true)
    },
    [dispatch]
  )

  const handleBarClick = useCallback(
    (priority: PriorityType) => {
      dispatch(statisticsAction.setSelectedPriority(priority))
      setShowPriorityModal(true)
    },
    [dispatch]
  )

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
        fill: '#ef4444'
      },
      {
        name: t('statistics:PRIORITY.MEDIUM'),
        value: statistics.priorityDistribution.medium,
        priority: 'medium' as PriorityType,
        fill: '#f59e0b'
      },
      {
        name: t('statistics:PRIORITY.LOW'),
        value: statistics.priorityDistribution.low,
        priority: 'low' as PriorityType,
        fill: '#22c55e'
      }
    ]
  }, [statistics.priorityDistribution, t])

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
              onChange={(e) =>
                dispatch(
                  statisticsAction.setDateRangeType(e.target.value as 'last7' | 'last30' | 'custom')
                )
              }
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
                    dispatch(
                      statisticsAction.setCustomDateRange({
                        ...customDateRange,
                        start: e.target.value
                      })
                    )
                  }
                />
                <input
                  type="date"
                  className="input input-bordered input-sm flex-1"
                  value={customDateRange.end}
                  onChange={(e) =>
                    dispatch(
                      statisticsAction.setCustomDateRange({
                        ...customDateRange,
                        end: e.target.value
                      })
                    )
                  }
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
                  onClick={() => dispatch(statisticsAction.setSelectedDate(null))}
                >
                  ✕
                </button>
              </span>
            </div>
          )}
          {selectedTag && (
            <div className="mt-2">
              <span className="badge badge-success gap-2">
                {t('statistics:FILTER.BY_TAG', { tag: selectedTag })}
                <button
                  className="ml-1"
                  onClick={() => dispatch(statisticsAction.setSelectedTag(null))}
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
              <LineChartComponent
                data={statistics.dailyCompleted}
                onLineClick={handleLineClick}
                selectedTag={selectedTag}
              />
            </div>
          </div>

          <div className="card card-bordered bg-base-100 p-4 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold">{t('statistics:CHART.TAG_DISTRIBUTION')}</h2>
            {pieData.length > 0 ? (
              <div className="h-[300px]">
                <PieChartComponent
                  data={pieData}
                  onPieClick={handlePieClick}
                />
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
              <BarChartComponent
                data={barData}
                onBarClick={handleBarClick}
              />
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
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 0 012 2m-6 9l2 2 4-4"
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
              <div className="stat-title">{t('statistics:INCOMPLETE')}</div>
              <div className="stat-value text-warning">{statistics.incompleteTasks}</div>
            </div>
            <div className="stat rounded-lg bg-base-100 shadow">
              <div className="stat-figure text-info">
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
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  ></path>
                </svg>
              </div>
              <div className="stat-title">{t('statistics:TOTAL')}</div>
              <div className="stat-value text-info">{statistics.totalTasks}</div>
            </div>
          </div>
        </div>

        <TaskListModal
          show={showTagModal}
          onClose={() => {
            setShowTagModal(false)
            dispatch(statisticsAction.setSelectedTag(null))
          }}
          title={t('statistics:TASK_LIST.TAG_TITLE', { tag: selectedTag || '' })}
          tasks={selectedTasksForTag}
          type="tag"
        />

        <TaskListModal
          show={showPriorityModal}
          onClose={() => {
            setShowPriorityModal(false)
            dispatch(statisticsAction.setSelectedPriority(null))
          }}
          title={t('statistics:TASK_LIST.PRIORITY_TITLE', {
            priority: selectedPriority
              ? t(`statistics:PRIORITY.${selectedPriority.toUpperCase()}`)
              : ''
          })}
          tasks={priorityTasks}
          type="priority"
        />

        {notification.show && (
          <div
            className={`fixed bottom-4 right-4 z-50 rounded-lg p-4 shadow-xl ${
              notification.success
                ? 'bg-success text-success-content'
                : 'bg-error text-error-content'
            }`}
          >
            {notification.message}
          </div>
        )}
      </div>
    </div>
  )
}
