import dayjs, { Dayjs } from 'dayjs'
import { Task, Note } from '@/interfaces'

export interface DailyCompletedTasks {
  date: string
  count: number
  tasks: Task[]
}

export interface PriorityDistribution {
  high: number
  medium: number
  low: number
  highTasks: Task[]
  mediumTasks: Task[]
  lowTasks: Task[]
}

export interface TagDistribution {
  tag: string
  count: number
  tasks: Task[]
}

export interface StatisticsData {
  dailyCompleted: DailyCompletedTasks[]
  priorityDistribution: PriorityDistribution
  tagDistribution: TagDistribution[]
  totalTasks: number
  completedTasks: number
  incompleteTasks: number
}

export type PriorityType = 'high' | 'medium' | 'low'
export type SortType = 'newest' | 'oldest'

/**
 * 获取任务完成的日期
 * @param task - 任务对象
 * @returns 任务完成的 Dayjs 对象，如果未完成则返回 null
 */
export function getTaskCompletedDate(task: Task): Dayjs | null {
  if (task.finishedAt) {
    return dayjs(task.finishedAt)
  }
  return null
}

/**
 * 根据优先级数字获取优先级标签
 * @param priority - 优先级数字
 * @returns 优先级标签 ('high' | 'medium' | 'low')
 */
export function getPriorityLabel(priority: number): PriorityType {
  if (priority >= 2) return 'high'
  if (priority === 1) return 'medium'
  return 'low'
}

/**
 * 从任务内容中提取标签
 * @param task - 任务对象
 * @param note - 可选的笔记对象，用于从笔记名称提取标签
 * @returns 提取的标签字符串
 */
export function extractTagFromTask(task: Task, note?: Note): string {
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
 * 按日期聚合已完成的任务
 * @param tasks - 任务数组
 * @param startDate - 开始日期
 * @param endDate - 结束日期
 * @returns 按日期聚合的已完成任务数组
 */
export function aggregateTasksByDate(
  tasks: Task[],
  startDate: Dayjs,
  endDate: Dayjs
): DailyCompletedTasks[] {
  const completedTasks = tasks.filter((t) => t.finishedAt !== null)
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

  return Array.from(dailyCompletedMap.values())
}

/**
 * 按优先级分组任务
 * @param tasks - 任务数组
 * @returns 按优先级分组的任务分布
 */
export function groupTasksByPriority(tasks: Task[]): PriorityDistribution {
  const priorityDistribution: PriorityDistribution = {
    high: 0,
    medium: 0,
    low: 0,
    highTasks: [],
    mediumTasks: [],
    lowTasks: []
  }

  tasks.forEach((task) => {
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

  return priorityDistribution
}

/**
 * 按标签分组任务
 * @param tasks - 任务数组
 * @param taskNoteMap - 任务到笔记的映射，用于提取标签
 * @returns 按标签分组的任务分布数组
 */
export function groupTasksByTag(tasks: Task[], taskNoteMap: Map<Task, Note>): TagDistribution[] {
  const tagMap = new Map<string, { count: number; tasks: Task[] }>()

  tasks.forEach((task) => {
    const note = taskNoteMap.get(task)
    const tag = extractTagFromTask(task, note)
    if (!tagMap.has(tag)) {
      tagMap.set(tag, { count: 0, tasks: [] })
    }
    const existing = tagMap.get(tag)!
    existing.count++
    existing.tasks.push(task)
  })

  return Array.from(tagMap.entries())
    .map(([tag, data]) => ({
      tag,
      count: data.count,
      tasks: data.tasks
    }))
    .sort((a, b) => b.count - a.count)
}

/**
 * 按日期范围筛选任务
 * @param tasks - 任务数组
 * @param startDate - 开始日期
 * @param endDate - 结束日期
 * @returns 筛选后的任务数组
 */
export function filterTasksByDateRange(tasks: Task[], startDate: Dayjs, endDate: Dayjs): Task[] {
  return tasks.filter((task) => {
    const createdAt = dayjs(task.createdAt)
    return createdAt.isAfter(startDate.startOf('day')) && createdAt.isBefore(endDate.endOf('day'))
  })
}

/**
 * 按优先级筛选任务
 * @param tasks - 任务数组
 * @param priority - 优先级 ('high' | 'medium' | 'low' | null)
 * @returns 筛选后的任务数组
 */
export function filterTasksByPriority(tasks: Task[], priority: PriorityType | null): Task[] {
  if (!priority) return tasks
  return tasks.filter((task) => getPriorityLabel(task.priority) === priority)
}

/**
 * 按搜索关键词筛选任务
 * @param tasks - 任务数组
 * @param searchTerm - 搜索关键词
 * @returns 筛选后的任务数组
 */
export function filterTasksBySearch(tasks: Task[], searchTerm: string): Task[] {
  if (!searchTerm.trim()) return tasks
  const lowerSearchTerm = searchTerm.toLowerCase()
  return tasks.filter((task) => task.content?.toLowerCase().includes(lowerSearchTerm))
}

/**
 * 按创建时间排序任务
 * @param tasks - 任务数组
 * @param sortType - 排序类型 ('newest' | 'oldest')
 * @returns 排序后的任务数组
 */
export function sortTasksByDate(tasks: Task[], sortType: SortType): Task[] {
  return [...tasks].sort((a, b) => {
    const dateA = dayjs(a.createdAt).valueOf()
    const dateB = dayjs(b.createdAt).valueOf()
    return sortType === 'newest' ? dateB - dateA : dateA - dateB
  })
}

/**
 * 计算完整的统计数据
 * @param notes - 笔记数组
 * @param dateRange - 日期范围
 * @returns 完整的统计数据
 */
export function calculateStatistics(
  notes: Note[],
  dateRange: { start: Dayjs; end: Dayjs }
): StatisticsData {
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

  const dailyCompleted = aggregateTasksByDate(allTasks, dateRange.start, dateRange.end)

  const incompleteForPriority = filterTasksByDateRange(
    incompleteTasks,
    dateRange.start,
    dateRange.end
  )

  const priorityDistribution = groupTasksByPriority(incompleteForPriority)
  const tagDistribution = groupTasksByTag(incompleteForPriority, taskNoteMap)

  return {
    dailyCompleted,
    priorityDistribution,
    tagDistribution,
    totalTasks: allTasks.length,
    completedTasks: completedTasks.length,
    incompleteTasks: incompleteTasks.length
  }
}

/**
 * 将统计数据转换为 CSV 格式
 * @param statistics - 统计数据
 * @param translations - 翻译对象
 * @returns CSV 格式的字符串
 */
export function statisticsToCSV(
  statistics: StatisticsData,
  translations: {
    completedTasksLabel: string
    dateLabel: string
    countLabel: string
    priorityDistributionLabel: string
    highLabel: string
    mediumLabel: string
    lowLabel: string
    tagDistributionLabel: string
  }
): string {
  const rows: string[][] = []

  rows.push([translations.completedTasksLabel, translations.dateLabel, translations.countLabel])
  statistics.dailyCompleted.forEach((day) => {
    rows.push(['', day.date, String(day.count)])
  })
  rows.push([])

  rows.push([translations.priorityDistributionLabel])
  rows.push([translations.highLabel, String(statistics.priorityDistribution.high)])
  rows.push([translations.mediumLabel, String(statistics.priorityDistribution.medium)])
  rows.push([translations.lowLabel, String(statistics.priorityDistribution.low)])
  rows.push([])

  rows.push([translations.tagDistributionLabel])
  statistics.tagDistribution.forEach((tag) => {
    rows.push([tag.tag, String(tag.count)])
  })

  return rows.map((e) => e.join(',')).join('\n')
}
