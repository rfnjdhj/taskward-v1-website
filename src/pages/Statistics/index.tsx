import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import dayjs from 'dayjs'
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

import { useGetNotesRequest } from '@/requests'
import { getDocumentTitle } from '@/utils'
import { useAppDispatch } from '@/hooks'
import { sidebarAction, ActiveSidebarItem } from '@/store'
import { Note, Task } from '@/interfaces'
import { Loading, Icon } from '@/components'

interface DailyCompletion {
  date: string
  count: number
}

interface TagDistribution {
  name: string
  value: number
}

interface PriorityStat {
  priority: string
  count: number
  color: string
}

interface EfficiencyData {
  thisWeekCompleted: number
  lastWeekCompleted: number
  thisWeekAvgTime: number
  lastWeekAvgTime: number
  completionChangeRate: number
  avgTimeChangeRate: number
}

const PRIORITY_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#6b7280']
const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#10b981', '#06b6d4', '#f59e0b', '#ef4444']

export default function Statistics(): JSX.Element {
  const { t, i18n } = useTranslation(['common', 'layout', 'statistics'])
  const sidebarDispatch = useAppDispatch()
  const [refreshKey, setRefreshKey] = useState(0)

  const { data: notesData, isLoading: isGetNotesLoading, refetch } = useGetNotesRequest()

  useEffect(() => {
    document.title = getDocumentTitle(t('statistics:TITLE', '数据统计'))
  }, [i18n.language])

  useEffect(() => {
    sidebarDispatch(sidebarAction.changeActiveSidebarItem(ActiveSidebarItem.None))
  }, [])

  const allTasks = useMemo(() => {
    if (!notesData?.notes) return []
    const tasks: (Task & { noteName: string | null })[] = []
    notesData.notes.forEach((note: Note) => {
      if (note.tasks) {
        note.tasks.forEach((task) => {
          tasks.push({ ...task, noteName: note.name })
        })
      }
    })
    return tasks
  }, [notesData])

  const completedTasks = useMemo(() => {
    return allTasks.filter((task) => task.finishedAt)
  }, [allTasks])

  const uncompletedTasks = useMemo(() => {
    return allTasks.filter((task) => !task.finishedAt)
  }, [allTasks])

  const dailyCompletionData: DailyCompletion[] = useMemo(() => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = dayjs().subtract(29 - i, 'day')
      return {
        date: date.format('MM-DD'),
        fullDate: date.format('YYYY-MM-DD'),
        count: 0
      }
    })

    completedTasks.forEach((task) => {
      if (task.finishedAt) {
        const finishedDate = dayjs(task.finishedAt).format('YYYY-MM-DD')
        const dayData = last30Days.find((d) => d.fullDate === finishedDate)
        if (dayData) {
          dayData.count += 1
        }
      }
    })

    return last30Days.map(({ date, count }) => ({ date, count }))
  }, [completedTasks])

  const tagDistributionData: TagDistribution[] = useMemo(() => {
    const tagMap = new Map<string, number>()

    uncompletedTasks.forEach((task) => {
      const tag = task.noteName || t('statistics:UNCATEGORIZED', '未分类')
      tagMap.set(tag, (tagMap.get(tag) || 0) + 1)
    })

    return Array.from(tagMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [uncompletedTasks, t])

  const priorityStatsData: PriorityStat[] = useMemo(() => {
    const priorityMap = new Map<number, number>()

    allTasks.forEach((task) => {
      const priority = task.priority || 0
      priorityMap.set(priority, (priorityMap.get(priority) || 0) + 1)
    })

    const priorityLabels = [
      t('statistics:PRIORITY.HIGH', '高优先级'),
      t('statistics:PRIORITY.MEDIUM', '中优先级'),
      t('statistics:PRIORITY.LOW', '低优先级'),
      t('statistics:PRIORITY.NONE', '无优先级')
    ]

    return Array.from({ length: 4 }, (_, i) => ({
      priority: priorityLabels[i],
      count: priorityMap.get(i) || 0,
      color: PRIORITY_COLORS[i]
    }))
  }, [allTasks, t])

  const efficiencyData: EfficiencyData = useMemo(() => {
    const now = dayjs()
    const thisWeekStart = now.startOf('week')
    const thisWeekEnd = now.endOf('week')
    const lastWeekStart = thisWeekStart.subtract(1, 'week')
    const lastWeekEnd = thisWeekStart.subtract(1, 'day')

    let thisWeekCompleted = 0
    let lastWeekCompleted = 0
    let thisWeekTotalTime = 0
    let lastWeekTotalTime = 0

    completedTasks.forEach((task) => {
      if (task.finishedAt && task.createdAt) {
        const finishedAt = dayjs(task.finishedAt)
        const createdAt = dayjs(task.createdAt)
        const completionTime = finishedAt.diff(createdAt, 'hour')

        if (finishedAt.isAfter(thisWeekStart) && finishedAt.isBefore(thisWeekEnd)) {
          thisWeekCompleted += 1
          thisWeekTotalTime += completionTime
        } else if (finishedAt.isAfter(lastWeekStart) && finishedAt.isBefore(lastWeekEnd)) {
          lastWeekCompleted += 1
          lastWeekTotalTime += completionTime
        }
      }
    })

    const thisWeekAvgTime = thisWeekCompleted > 0 ? Math.round(thisWeekTotalTime / thisWeekCompleted) : 0
    const lastWeekAvgTime = lastWeekCompleted > 0 ? Math.round(lastWeekTotalTime / lastWeekCompleted) : 0

    const completionChangeRate = lastWeekCompleted > 0
      ? Math.round(((thisWeekCompleted - lastWeekCompleted) / lastWeekCompleted) * 100)
      : 0

    const avgTimeChangeRate = lastWeekAvgTime > 0
      ? Math.round(((thisWeekAvgTime - lastWeekAvgTime) / lastWeekAvgTime) * 100)
      : 0

    return {
      thisWeekCompleted,
      lastWeekCompleted,
      thisWeekAvgTime,
      lastWeekAvgTime,
      completionChangeRate,
      avgTimeChangeRate
    }
  }, [completedTasks])

  const handleRefresh = async () => {
    await refetch()
    setRefreshKey((prev) => prev + 1)
  }

  if (isGetNotesLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loading />
      </div>
    )
  }

  return (
    <div className="relative flex h-full w-auto flex-col overflow-y-auto">
      <div className="mx-auto mb-8 flex w-full flex-col gap-6 p-4 lg:p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold dark:text-white">
            {t('statistics:TITLE', '数据统计')}
          </h1>
          <button
            onClick={handleRefresh}
            className="btn btn-ghost btn-sm gap-2"
            title={t('statistics:REFRESH', '刷新数据')}
          >
            <Icon.Refresh className="h-5 w-5" />
            {t('statistics:REFRESH', '刷新')}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title={t('statistics:EFFICIENCY.THIS_WEEK_COMPLETED', '本周完成')}
            value={efficiencyData.thisWeekCompleted}
            subValue={efficiencyData.completionChangeRate}
            suffix={t('statistics:EFFICIENCY.TASKS', '个任务')}
          />
          <StatCard
            title={t('statistics:EFFICIENCY.AVG_COMPLETION_TIME', '平均完成时间')}
            value={efficiencyData.thisWeekAvgTime}
            subValue={efficiencyData.avgTimeChangeRate}
            suffix={t('statistics:EFFICIENCY.HOURS', '小时')}
            inverseTrend
          />
          <StatCard
            title={t('statistics:TOTAL_TASKS', '总任务数')}
            value={allTasks.length}
            suffix={t('statistics:TASKS', '个')}
          />
          <StatCard
            title={t('statistics:COMPLETION_RATE', '完成率')}
            value={allTasks.length > 0 ? Math.round((completedTasks.length / allTasks.length) * 100) : 0}
            suffix="%"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-lg dark:text-white">
                {t('statistics:CHARTS.COMPLETION_TREND', '任务完成趋势（最近30天）')}
              </h2>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyCompletionData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      stroke="currentColor"
                      className="text-gray-500 dark:text-gray-400"
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      stroke="currentColor"
                      className="text-gray-500 dark:text-gray-400"
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--tw-bg-opacity)',
                        border: '1px solid var(--tw-border-opacity)',
                        borderRadius: '8px'
                      }}
                      labelStyle={{ color: 'var(--tw-text-opacity)' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-lg dark:text-white">
                {t('statistics:CHARTS.TAG_DISTRIBUTION', '未完成任务分布（按标签）')}
              </h2>
              <div className="h-64 w-full">
                {tagDistributionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={tagDistributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {tagDistributionData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--tw-bg-opacity)',
                          border: '1px solid var(--tw-border-opacity)',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-gray-500 dark:text-gray-400">
                    {t('statistics:NO_DATA', '暂无数据')}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl lg:col-span-2">
            <div className="card-body">
              <h2 className="card-title text-lg dark:text-white">
                {t('statistics:CHARTS.PRIORITY_STATS', '任务优先级统计')}
              </h2>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={priorityStatsData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                    <XAxis
                      dataKey="priority"
                      tick={{ fontSize: 12 }}
                      stroke="currentColor"
                      className="text-gray-500 dark:text-gray-400"
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      stroke="currentColor"
                      className="text-gray-500 dark:text-gray-400"
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--tw-bg-opacity)',
                        border: '1px solid var(--tw-border-opacity)',
                        borderRadius: '8px'
                      }}
                      cursor={{ fill: 'transparent' }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {priorityStatsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface StatCardProps {
  title: string
  value: number
  subValue?: number
  suffix: string
  inverseTrend?: boolean
}

function StatCard({ title, value, subValue, suffix, inverseTrend = false }: StatCardProps) {
  const isPositive = inverseTrend ? (subValue || 0) < 0 : (subValue || 0) > 0
  const trendColor = isPositive ? 'text-success' : subValue === 0 ? 'text-gray-500' : 'text-error'
  const trendIcon = isPositive ? '↑' : subValue === 0 ? '-' : '↓'

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body p-4">
        <h3 className="text-sm text-gray-500 dark:text-gray-400">{title}</h3>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold dark:text-white">{value}</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">{suffix}</span>
        </div>
        {subValue !== undefined && (
          <div className={clsx('text-xs', trendColor)}>
            {trendIcon} {Math.abs(subValue)}% {isPositive ? '增长' : subValue === 0 ? '持平' : '下降'}
          </div>
        )}
      </div>
    </div>
  )
}
