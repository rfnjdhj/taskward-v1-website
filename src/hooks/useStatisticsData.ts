import { useMemo } from 'react'
import dayjs, { Dayjs } from 'dayjs'
import { Note, Task } from '@/interfaces'

/**
 * 每日完成任务数据接口
 */
export interface DailyCompletedTasks {
  date: string
  count: number
  tasks: Task[]
}

/**
 * 优先级分布数据接口
 */
export interface PriorityDistribution {
  high: number
  medium: number
  low: number
  highTasks: Task[]
  mediumTasks: Task[]
  lowTasks: Task[]
}

/**
 * 标签分布数据接口
 */
export interface TagDistribution {
  tag: string
  count: number
  tasks: Task[]
}

/**
 * 统计数据接口
 */
export interface StatisticsData {
  dailyCompleted: DailyCompletedTasks[]
  priorityDistribution: PriorityDistribution
  tagDistribution: TagDistribution[]
  totalTasks: number
  completedTasks: number
  incompleteTasks: number
}

/**
 * 获取任务完成日期
 * @param task 任务对象
 * @returns 完成日期或 null
 */
function getTaskCompletedDate(task: Task): Dayjs | null {
  if (task.finishedAt) {
    return dayjs(task.finishedAt)
  }
  return null
}

/**
 * 获取优先级标签
 * @param priority 优先级数值
 * @returns 优先级标签字符串
 */
function getPriorityLabel(priority: number): string {
  if (priority >= 2) return 'high'
  if (priority === 1) return 'medium'
  return 'low'
}

/**
 * 从任务中提取标签
 * @param task 任务对象
 * @param note 笔记对象（可选）
 * @returns 标签字符串
 */
function extractTagFromTask(task: Task, note?: Note): string {
  if (note?.name && note.name.trim()) {
    const words = note.name.trim().split(/\s+/)
    if (words.length > 0) {
      return words[0].length > 15 ? words[0].substring(0, 15) + '...' : words[0]
    }
  }
  if (task.content) {
    const words = task.content.trim().split(/\s+/)
    if (words.length > 0) {
      return words[0].length > 15 ? words[0].substring(0, 15) + '...' : words[0]
    }
  }
  return 'Untitled'
}

/**
 * 计算统计数据的 Hook
 * @param notes 笔记列表
 * @param dateRange 日期范围
 * @returns 统计数据
 */
export function useStatisticsData(
  notes: Note[] | undefined,
  dateRange: { start: Dayjs; end: Dayjs } | null
): StatisticsData {
  const dateRangeKey = dateRange
    ? `${dateRange.start.format('YYYY-MM-DD')}-${dateRange.end.format('YYYY-MM-DD')}`
    : 'default'

  return useMemo(() => {
    if (!notes || notes.length === 0) {
      return {
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
      }
    }

    const allTasks: Task[] = []
    const taskNoteMap = new Map<Task, Note>()

    notes.forEach((note) => {
      note.tasks.forEach((task) => {
        allTasks.push(task)
        taskNoteMap.set(task, note)
      })
    })

    const completedTasks = allTasks.filter((t) => t.finishedAt !== null)
    const incompleteTasks = allTasks.filter((t) => t.finishedAt === null)

    const endDate = dateRange?.end ?? dayjs()
    const startDate = dateRange?.start ?? dayjs().subtract(29, 'day')
    const daysDiff = endDate.diff(startDate, 'day') + 1

    const dailyCompletedMap = new Map<string, DailyCompletedTasks>()
    for (let i = 0; i < daysDiff; i++) {
      const date = startDate.add(i, 'day')
      const dateStr = date.format('YYYY-MM-DD')
      dailyCompletedMap.set(dateStr, {
        date: dateStr,
        count: 0,
        tasks: []
      })
    }

    completedTasks.forEach((task) => {
      const completedDate = getTaskCompletedDate(task)
      if (completedDate) {
        const dateStr = completedDate.format('YYYY-MM-DD')
        if (dailyCompletedMap.has(dateStr)) {
          const existing = dailyCompletedMap.get(dateStr)!
          existing.count += 1
          existing.tasks.push(task)
        }
      }
    })

    const dailyCompleted = Array.from(dailyCompletedMap.values())

    const incompleteForPriority = dateRange
      ? incompleteTasks.filter((t) => {
          const createdAt = dayjs(t.createdAt)
          return (
            createdAt.isAfter(startDate.startOf('day')) && createdAt.isBefore(endDate.endOf('day'))
          )
        })
      : incompleteTasks

    const priorityDistribution: PriorityDistribution = {
      high: 0,
      medium: 0,
      low: 0,
      highTasks: [],
      mediumTasks: [],
      lowTasks: []
    }

    incompleteForPriority.forEach((task) => {
      const priority = getPriorityLabel(task.priority)
      if (priority === 'high') {
        priorityDistribution.high++
        priorityDistribution.highTasks.push(task)
      } else if (priority === 'medium') {
        priorityDistribution.medium++
        priorityDistribution.mediumTasks.push(task)
      } else {
        priorityDistribution.low++
        priorityDistribution.lowTasks.push(task)
      }
    })

    const tagMap = new Map<string, { count: number; tasks: Task[] }>()
    incompleteForPriority.forEach((task) => {
      const note = taskNoteMap.get(task)
      const tag = extractTagFromTask(task, note)
      if (!tagMap.has(tag)) {
        tagMap.set(tag, { count: 0, tasks: [] })
      }
      const existing = tagMap.get(tag)!
      existing.count++
      existing.tasks.push(task)
    })

    const tagDistribution: TagDistribution[] = Array.from(tagMap.entries())
      .map(([tag, data]) => ({
        tag,
        count: data.count,
        tasks: data.tasks
      }))
      .sort((a, b) => b.count - a.count)

    return {
      dailyCompleted,
      priorityDistribution,
      tagDistribution,
      totalTasks: allTasks.length,
      completedTasks: completedTasks.length,
      incompleteTasks: incompleteTasks.length
    }
  }, [notes, dateRangeKey])
}
