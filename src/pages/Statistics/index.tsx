import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import dayjs from 'dayjs'
import html2canvas from 'html2canvas'
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

import { Loading, Modal } from '@/components'
import { useGetNotesRequest } from '@/requests'
import { useAppDispatch } from '@/hooks'
import { sidebarAction, ActiveSidebarItem } from '@/store'
import { getDocumentTitle } from '@/utils'
import { Note, Task } from '@/interfaces'

import TaskListModal from './TaskListModal'
import styles from './styles.module.css'

interface ChartData {
  date: string
  count: number
  tasks: Task[]
}

interface LabelData {
  name: string
  value: number
  tasks: Task[]
}

interface PriorityData {
  name: string
  value: number
  priority: number
  tasks: Task[]
}

const COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16'
]
const PRIORITY_COLORS = ['#ef4444', '#f59e0b', '#3b82f6']

export default function Statistics(): JSX.Element {
  const { t, i18n } = useTranslation(['statistics', 'layout'])
  const sidebarDispatch = useAppDispatch()
  const chartRef = useRef<HTMLDivElement>(null)

  const { data: notesData, isLoading, refetch } = useGetNotesRequest()

  const [startDate, setStartDate] = useState<string>(
    dayjs().subtract(29, 'day').format('YYYY-MM-DD')
  )
  const [endDate, setEndDate] = useState<string>(dayjs().format('YYYY-MM-DD'))
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null)
  const [selectedPriority, setSelectedPriority] = useState<number | null>(null)
  const [taskListOpen, setTaskListOpen] = useState(false)
  const [taskListTasks, setTaskListTasks] = useState<Task[]>([])
  const [taskListTitle, setTaskListTitle] = useState('')

  useEffect(() => {
    document.title = getDocumentTitle(t('statistics:STATISTICS.TITLE'))
  }, [i18n.language])

  useEffect(() => {
    sidebarDispatch(sidebarAction.changeActiveSidebarItem(ActiveSidebarItem.Statistics))
  }, [])

  const allTasks = useMemo(() => {
    if (!notesData?.notes) return []
    const tasks: (Task & { noteName?: string | null })[] = []
    notesData.notes.forEach((note: Note) => {
      if (note.tasks) {
        note.tasks.forEach((task) => {
          tasks.push({ ...task, noteName: note.name })
        })
      }
    })
    return tasks
  }, [notesData])

  const lineChartData: ChartData[] = useMemo(() => {
    const dataMap = new Map<string, ChartData>()
    const start = dayjs(startDate)
    const end = dayjs(endDate)
    let current = start

    while (current.isBefore(end) || current.isSame(end, 'day')) {
      const dateStr = current.format('YYYY-MM-DD')
      dataMap.set(dateStr, { date: dateStr, count: 0, tasks: [] })
      current = current.add(1, 'day')
    }

    allTasks.forEach((task) => {
      if (task.finishedAt) {
        const dateStr = dayjs(task.finishedAt).format('YYYY-MM-DD')
        if (dataMap.has(dateStr)) {
          const existing = dataMap.get(dateStr)!
          existing.count++
          existing.tasks.push(task)
        }
      }
    })

    return Array.from(dataMap.values())
  }, [allTasks, startDate, endDate])

  const pieChartData: LabelData[] = useMemo(() => {
    const labelMap = new Map<string, LabelData>()

    allTasks.forEach((task) => {
      if (!task.finishedAt) {
        const label =
          (task as Task & { noteName?: string }).noteName ||
          t('statistics:STATISTICS.PIE_CHART.NO_LABEL')
        if (labelMap.has(label)) {
          labelMap.get(label)!.value++
          labelMap.get(label)!.tasks.push(task)
        } else {
          labelMap.set(label, { name: label, value: 1, tasks: [task] })
        }
      }
    })

    let data = Array.from(labelMap.values())
    if (selectedDate) {
      data = data
        .map((item) => ({
          ...item,
          tasks: item.tasks.filter((t) => {
            if (!t.createdAt) return false
            return dayjs(t.createdAt).format('YYYY-MM-DD') === selectedDate
          })
        }))
        .filter((item) => item.tasks.length > 0)
    }

    return data
  }, [allTasks, selectedDate, t])

  const barChartData: PriorityData[] = useMemo(() => {
    const priorityMap = new Map<number, PriorityData>()
    priorityMap.set(2, {
      name: t('statistics:STATISTICS.BAR_CHART.HIGH'),
      value: 0,
      priority: 2,
      tasks: []
    })
    priorityMap.set(1, {
      name: t('statistics:STATISTICS.BAR_CHART.MEDIUM'),
      value: 0,
      priority: 1,
      tasks: []
    })
    priorityMap.set(0, {
      name: t('statistics:STATISTICS.BAR_CHART.LOW'),
      value: 0,
      priority: 0,
      tasks: []
    })

    allTasks.forEach((task) => {
      const priority = task.priority ?? 1
      const existing = priorityMap.get(priority)
      if (existing) {
        existing.value++
        existing.tasks.push(task)
      }
    })

    let data = Array.from(priorityMap.values())
    if (selectedDate) {
      data = data.map((item) => ({
        ...item,
        tasks: item.tasks.filter((t) => {
          if (!t.createdAt) return false
          return dayjs(t.createdAt).format('YYYY-MM-DD') === selectedDate
        })
      }))
    }

    return data
  }, [allTasks, selectedDate, t])

  const summaryData = useMemo(() => {
    const total = allTasks.length
    const completed = allTasks.filter((t) => t.finishedAt).length
    const pending = total - completed
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0
    return { total, completed, pending, rate }
  }, [allTasks])

  const handleLineClick = useCallback((data: any) => {
    if (data && data.activeLabel) {
      const date = data.activeLabel
      setSelectedDate((prev) => (prev === date ? null : date))
    }
  }, [])

  const handlePieClick = useCallback(
    (data: any) => {
      if (data && data.name) {
        const label = data.name
        const clickedData = pieChartData.find((item) => item.name === label)
        if (clickedData) {
          setSelectedLabel((prev) => (prev === label ? null : label))
          setTaskListTasks(clickedData.tasks)
          setTaskListTitle(`${t('statistics:STATISTICS.PIE_CHART.TITLE')} - ${label}`)
          setTaskListOpen(true)
        }
      }
    },
    [pieChartData, t]
  )

  const handleBarClick = useCallback(
    (data: any) => {
      if (data && data.activePayload && data.activePayload[0]) {
        const priority = data.activePayload[0].payload.priority
        const clickedData = barChartData.find((item) => item.priority === priority)
        if (clickedData) {
          setSelectedPriority((prev) => (prev === priority ? null : priority))
          setTaskListTasks(clickedData.tasks)
          setTaskListTitle(`${t('statistics:STATISTICS.BAR_CHART.TITLE')} - ${clickedData.name}`)
          setTaskListOpen(true)
        }
      }
    },
    [barChartData, t]
  )

  const handleExportImage = useCallback(async () => {
    if (chartRef.current) {
      const canvas = await html2canvas(chartRef.current)
      const link = document.createElement('a')
      link.download = `statistics-${dayjs().format('YYYY-MM-DD')}.png`
      link.href = canvas.toDataURL()
      link.click()
    }
  }, [])

  const handleExportCSV = useCallback(() => {
    const headers = ['ID', 'Content', 'Priority', 'Created At', 'Finished At', 'Note']
    const rows = allTasks.map((task) => [
      task.id,
      task.content || '',
      task.priority ?? 1,
      task.createdAt ? dayjs(task.createdAt).format('YYYY-MM-DD HH:mm:ss') : '',
      task.finishedAt ? dayjs(task.finishedAt).format('YYYY-MM-DD HH:mm:ss') : '',
      (task as Task & { noteName?: string }).noteName || ''
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `statistics-${dayjs().format('YYYY-MM-DD')}.csv`
    link.click()
  }, [allTasks])

  const handleRefresh = useCallback(() => {
    refetch()
  }, [refetch])

  if (isLoading) {
    return <Loading fullScreen />
  }

  return (
    <div className="relative flex h-full w-auto flex-col overflow-y-auto">
      <div className="mx-auto mb-8 flex w-full flex-col gap-6 p-4">
        <div className="dark:bg-darkMode-light flex flex-col gap-4 rounded-lg bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-2xl font-bold dark:text-white">
              {t('statistics:STATISTICS.TITLE')}
            </h1>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleRefresh}
                className="btn btn-sm btn-ghost gap-2"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                {t('statistics:STATISTICS.REFRESH')}
              </button>
              <button
                onClick={handleExportImage}
                className="btn btn-sm btn-primary gap-2"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                {t('statistics:STATISTICS.EXPORT_IMAGE')}
              </button>
              <button
                onClick={handleExportCSV}
                className="btn btn-sm btn-secondary gap-2"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                {t('statistics:STATISTICS.EXPORT_CSV')}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t('statistics:STATISTICS.SUMMARY.TOTAL_TASKS')}
              </div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {summaryData.total}
              </div>
            </div>
            <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t('statistics:STATISTICS.SUMMARY.COMPLETED_TASKS')}
              </div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {summaryData.completed}
              </div>
            </div>
            <div className="rounded-lg bg-yellow-50 p-4 dark:bg-yellow-900/20">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t('statistics:STATISTICS.SUMMARY.PENDING_TASKS')}
              </div>
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {summaryData.pending}
              </div>
            </div>
            <div className="rounded-lg bg-purple-50 p-4 dark:bg-purple-900/20">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t('statistics:STATISTICS.SUMMARY.COMPLETION_RATE')}
              </div>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {summaryData.rate}%
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium dark:text-gray-300">
                {t('statistics:STATISTICS.DATE_RANGE')}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input input-sm input-bordered"
              />
              <span className="dark:text-gray-400">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input input-sm input-bordered"
              />
            </div>
            {selectedDate && (
              <div className="badge badge-primary gap-2">
                {t('statistics:STATISTICS.LINE_CHART.SELECTED_DATE')}: {selectedDate}
                <button
                  onClick={() => setSelectedDate(null)}
                  className="btn btn-xs btn-ghost btn-circle"
                >
                  ×
                </button>
              </div>
            )}
            {selectedLabel && (
              <div className="badge badge-secondary gap-2">
                {t('statistics:STATISTICS.PIE_CHART.SELECTED_LABEL')}: {selectedLabel}
                <button
                  onClick={() => setSelectedLabel(null)}
                  className="btn btn-xs btn-ghost btn-circle"
                >
                  ×
                </button>
              </div>
            )}
            {selectedPriority !== null && (
              <div className="badge badge-accent gap-2">
                {t('statistics:STATISTICS.BAR_CHART.SELECTED_PRIORITY')}:{' '}
                {selectedPriority === 2
                  ? t('statistics:STATISTICS.PRIORITY.HIGH')
                  : selectedPriority === 1
                    ? t('statistics:STATISTICS.PRIORITY.MEDIUM')
                    : t('statistics:STATISTICS.PRIORITY.LOW')}
                <button
                  onClick={() => setSelectedPriority(null)}
                  className="btn btn-xs btn-ghost btn-circle"
                >
                  ×
                </button>
              </div>
            )}
          </div>
        </div>

        <div
          ref={chartRef}
          className={clsx('flex flex-col gap-6', styles.contentWrapper)}
        >
          <div className="dark:bg-darkMode-light rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-lg font-semibold dark:text-white">
              {t('statistics:STATISTICS.LINE_CHART.TITLE')}
            </h2>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              {t('statistics:STATISTICS.LINE_CHART.DESCRIPTION')}
            </p>
            <div className="h-80 w-full">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <LineChart
                  data={lineChartData}
                  onClick={handleLineClick}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#374151"
                    opacity={0.2}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    tickFormatter={(value) => dayjs(value).format('MM-DD')}
                  />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: 'none',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: '#f3f4f6' }}
                    itemStyle={{ color: '#f3f4f6' }}
                    formatter={(value: number) => [
                      value,
                      t('statistics:STATISTICS.LINE_CHART.Y_AXIS')
                    ]}
                    labelFormatter={(label) => dayjs(label).format('YYYY-MM-DD')}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', strokeWidth: 0, r: 4 }}
                    activeDot={{ r: 6, fill: '#3b82f6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="dark:bg-darkMode-light rounded-lg bg-white p-6 shadow-sm">
              <h2 className="mb-2 text-lg font-semibold dark:text-white">
                {t('statistics:STATISTICS.PIE_CHART.TITLE')}
              </h2>
              <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                {t('statistics:STATISTICS.PIE_CHART.DESCRIPTION')}
              </p>
              <div className="h-80 w-full">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      onClick={handlePieClick}
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                          stroke={selectedLabel === entry.name ? '#fff' : 'none'}
                          strokeWidth={selectedLabel === entry.name ? 3 : 0}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        border: 'none',
                        borderRadius: '8px'
                      }}
                      itemStyle={{ color: '#f3f4f6' }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="dark:bg-darkMode-light rounded-lg bg-white p-6 shadow-sm">
              <h2 className="mb-2 text-lg font-semibold dark:text-white">
                {t('statistics:STATISTICS.BAR_CHART.TITLE')}
              </h2>
              <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                {t('statistics:STATISTICS.BAR_CHART.DESCRIPTION')}
              </p>
              <div className="h-80 w-full">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <BarChart
                    data={barChartData}
                    onClick={handleBarClick}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#374151"
                      opacity={0.2}
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                    />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        border: 'none',
                        borderRadius: '8px'
                      }}
                      itemStyle={{ color: '#f3f4f6' }}
                    />
                    <Bar
                      dataKey="value"
                      radius={[4, 4, 0, 0]}
                    >
                      {barChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={PRIORITY_COLORS[index % PRIORITY_COLORS.length]}
                          fillOpacity={
                            selectedPriority === null || selectedPriority === entry.priority
                              ? 1
                              : 0.3
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>

      <TaskListModal
        isOpen={taskListOpen}
        onClose={() => setTaskListOpen(false)}
        tasks={taskListTasks}
        title={taskListTitle}
      />
    </div>
  )
}
