import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import { toPng } from 'html-to-image'
import Papa from 'papaparse'
import clsx from 'clsx'
import { LineChart, PieChart, BarChart, VirtualTaskList, Loading, Modal } from '@/components'
import { Icon } from '@/components/Svg'
import { useGetNotesRequest } from '@/requests'
import { useAppDispatch } from '@/hooks'
import { sidebarAction, ActiveSidebarItem } from '@/store'
import { getDocumentTitle } from '@/utils'
import {
  selectAllTasksFromNotes,
  calculateDailyCompletedStats,
  calculateTagDistribution,
  calculatePriorityStats,
  filterTasksByDate,
  filterTasksByTag,
  filterTasksByPriority,
  generateCSVData,
  TaskWithNote,
  DailyCompletedStats,
  TagDistribution,
  PriorityStats
} from '@/utils'

type DateRange = {
  start: Date
  end: Date
}

export default function Statistics() {
  const { t, i18n } = useTranslation(['statistics', 'common', 'layout'])
  const dispatch = useAppDispatch()
  const { data: notesData, isLoading, refetch } = useGetNotesRequest()

  const chartContainerRef = useRef<HTMLDivElement>(null)
  const lastDataRef = useRef<string>('')

  const [dateRange, setDateRange] = useState<DateRange>(() => ({
    start: dayjs().subtract(29, 'day').toDate(),
    end: dayjs().toDate()
  }))

  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [selectedPriority, setSelectedPriority] = useState<'high' | 'medium' | 'low' | null>(null)

  const [showTaskModal, setShowTaskModal] = useState(false)
  const [modalTasks, setModalTasks] = useState<TaskWithNote[]>([])
  const [modalTitle, setModalTitle] = useState('')

  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    document.title = getDocumentTitle(t('layout:SIDEBAR.TITLE.STATISTICS'))
  }, [i18n.language, t])

  useEffect(() => {
    dispatch(sidebarAction.changeActiveSidebarItem(ActiveSidebarItem.Statistics))
  }, [dispatch])

  const allTasks = useMemo(() => {
    if (!notesData?.notes) return []
    return selectAllTasksFromNotes(notesData.notes)
  }, [notesData?.notes])

  const dailyCompletedStats = useMemo(() => {
    return calculateDailyCompletedStats(allTasks, dateRange.start, dateRange.end)
  }, [allTasks, dateRange.start, dateRange.end])

  const uncompletedTasks = useMemo(() => {
    return allTasks.filter((task) => task.finishedAt === null)
  }, [allTasks])

  const tagDistribution = useMemo(() => {
    let tasks = uncompletedTasks
    if (selectedDate) {
      tasks = filterTasksByDate(
        allTasks.filter((t) => t.finishedAt === null),
        selectedDate
      )
    }
    return calculateTagDistribution(tasks)
  }, [uncompletedTasks, allTasks, selectedDate])

  const priorityStats = useMemo(() => {
    let tasks = uncompletedTasks
    if (selectedDate) {
      tasks = filterTasksByDate(
        allTasks.filter((t) => t.finishedAt === null),
        selectedDate
      )
    }
    return calculatePriorityStats(tasks)
  }, [uncompletedTasks, allTasks, selectedDate])

  const tagDailyStats = useMemo(() => {
    if (!selectedTag) return dailyCompletedStats
    return dailyCompletedStats.map((stat) => ({
      ...stat,
      count: stat.tasks.filter((task) => (task.noteName || 'Untitled') === selectedTag).length,
      tasks: stat.tasks.filter((task) => (task.noteName || 'Untitled') === selectedTag)
    }))
  }, [dailyCompletedStats, selectedTag])

  const handleRefresh = useCallback(() => {
    const currentData = JSON.stringify(notesData)
    if (currentData !== lastDataRef.current) {
      lastDataRef.current = currentData
      refetch()
    }
  }, [notesData, refetch])

  const handleDateRangeChange = (type: 'start' | 'end', value: string) => {
    setDateRange((prev) => ({
      ...prev,
      [type]: new Date(value)
    }))
    setSelectedDate(null)
    setSelectedTag(null)
    setSelectedPriority(null)
  }

  const handleExportImage = async () => {
    if (!chartContainerRef.current) return
    setIsExporting(true)
    try {
      const dataUrl = await toPng(chartContainerRef.current, {
        backgroundColor: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff'
      })
      const link = document.createElement('a')
      link.download = `statistics-${dayjs().format('YYYY-MM-DD-HHmmss')}.png`
      link.href = dataUrl
      link.click()
    } catch (error) {
      console.error('Failed to export image:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportCSV = () => {
    const csvData = generateCSVData(dailyCompletedStats, tagDistribution, priorityStats)
    const csv = Papa.unparse(csvData)
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `statistics-${dayjs().format('YYYY-MM-DD-HHmmss')}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const handleDateSelect = (date: string | null) => {
    setSelectedDate(date)
    if (date) {
      setSelectedTag(null)
      setSelectedPriority(null)
    }
  }

  const handleTagSelect = (tag: string | null) => {
    setSelectedTag(tag)
  }

  const handlePrioritySelect = (priority: 'high' | 'medium' | 'low' | null) => {
    setSelectedPriority(priority)
    if (priority) {
      const tasks = priorityStats.find((p) => p.priority === priority)?.tasks || []
      setModalTasks(tasks)
      setModalTitle(
        t('statistics:MODAL.PRIORITY_TASKS', {
          priority: t(`statistics:PRIORITY.${priority.toUpperCase()}`)
        })
      )
      setShowTaskModal(true)
    }
  }

  const handlePieChartClick = (tag: string | null) => {
    if (tag) {
      const tasks = tagDistribution.find((t) => t.tagName === tag)?.tasks || []
      setModalTasks(tasks)
      setModalTitle(t('statistics:MODAL.TAG_TASKS', { tag }))
      setShowTaskModal(true)
    }
    setSelectedTag(tag)
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loading />
      </div>
    )
  }

  return (
    <div className="relative flex h-full w-auto flex-col overflow-y-auto">
      <div className="mx-auto mb-80 w-full max-w-6xl p-4">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('statistics:TITLE')}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleRefresh}
              className="btn btn-ghost btn-sm gap-2"
            >
              <Icon.Refresh className="h-4 w-4" />
              {t('statistics:REFRESH')}
            </button>
            <button
              onClick={handleExportImage}
              disabled={isExporting}
              className="btn btn-ghost btn-sm gap-2"
            >
              <Icon.Image className="h-4 w-4" />
              {t('statistics:EXPORT_IMAGE')}
            </button>
            <button
              onClick={handleExportCSV}
              className="btn btn-ghost btn-sm gap-2"
            >
              <Icon.FileDownload className="h-4 w-4" />
              {t('statistics:EXPORT_CSV')}
            </button>
          </div>
        </div>

        <div className="mb-6 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('statistics:DATE_RANGE.START')}:
              </label>
              <input
                type="date"
                value={dayjs(dateRange.start).format('YYYY-MM-DD')}
                onChange={(e) => handleDateRangeChange('start', e.target.value)}
                className="input input-sm input-bordered w-40"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('statistics:DATE_RANGE.END')}:
              </label>
              <input
                type="date"
                value={dayjs(dateRange.end).format('YYYY-MM-DD')}
                onChange={(e) => handleDateRangeChange('end', e.target.value)}
                className="input input-sm input-bordered w-40"
              />
            </div>
            {selectedDate && (
              <div className="flex items-center gap-2">
                <span className="badge badge-primary gap-1">
                  {t('statistics:SELECTED_DATE')}: {selectedDate}
                  <button
                    onClick={() => setSelectedDate(null)}
                    className="btn btn-ghost btn-xs"
                  >
                    ×
                  </button>
                </span>
              </div>
            )}
            {selectedTag && (
              <div className="flex items-center gap-2">
                <span className="badge badge-secondary gap-1">
                  {t('statistics:SELECTED_TAG')}: {selectedTag}
                  <button
                    onClick={() => setSelectedTag(null)}
                    className="btn btn-ghost btn-xs"
                  >
                    ×
                  </button>
                </span>
              </div>
            )}
          </div>
        </div>

        <div
          ref={chartContainerRef}
          className="grid gap-6"
        >
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              {t('statistics:CHART.LINE_TITLE')}
            </h2>
            <LineChart
              data={tagDailyStats}
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
              highlightTag={selectedTag}
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                {t('statistics:CHART.PIE_TITLE')}
              </h2>
              <PieChart
                data={tagDistribution}
                selectedTag={selectedTag}
                onTagSelect={handlePieChartClick}
              />
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                {t('statistics:CHART.BAR_TITLE')}
              </h2>
              <BarChart
                data={priorityStats}
                selectedPriority={selectedPriority}
                onPrioritySelect={handlePrioritySelect}
              />
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              {t('statistics:STATS.SUMMARY')}
            </h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-lg bg-emerald-50 p-4 text-center dark:bg-emerald-900/20">
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {dailyCompletedStats.reduce((sum, d) => sum + d.count, 0)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {t('statistics:STATS.TOTAL_COMPLETED')}
                </div>
              </div>
              <div className="rounded-lg bg-blue-50 p-4 text-center dark:bg-blue-900/20">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {uncompletedTasks.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {t('statistics:STATS.UNCOMPLETED')}
                </div>
              </div>
              <div className="rounded-lg bg-amber-50 p-4 text-center dark:bg-amber-900/20">
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {tagDistribution.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {t('statistics:STATS.TOTAL_NOTES')}
                </div>
              </div>
              <div className="rounded-lg bg-purple-50 p-4 text-center dark:bg-purple-900/20">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {allTasks.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {t('statistics:STATS.TOTAL_TASKS')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        show={showTaskModal}
        toggle={() => setShowTaskModal(false)}
        modalClassName="max-w-2xl"
      >
        <div className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{modalTitle}</h3>
            <button
              onClick={() => setShowTaskModal(false)}
              className="btn btn-ghost btn-sm btn-circle"
            >
              <Icon.Close className="h-4 w-4" />
            </button>
          </div>
          <VirtualTaskList tasks={modalTasks} />
        </div>
      </Modal>
    </div>
  )
}
