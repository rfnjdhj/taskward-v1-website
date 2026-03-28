import dayjs, { Dayjs } from 'dayjs'
import { Note, Task } from '@/interfaces'

/**
 * Represents daily completed tasks statistics
 */
export interface DailyCompletedTasks {
  date: string
  count: number
  tasks: Task[]
}

/**
 * Represents priority distribution statistics
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
 * Represents tag distribution statistics
 */
export interface TagDistribution {
  tag: string
  count: number
  tasks: Task[]
}

/**
 * Represents complete statistics data
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
 * Gets the completed date of a task
 * @param task - The task to get the completed date from
 * @returns Dayjs object of completed date or null if not completed
 */
export function getTaskCompletedDate(task: Task): Dayjs | null {
  if (task.finishedAt) {
    return dayjs(task.finishedAt)
  }
  return null
}

/**
 * Gets the priority label for a task
 * @param priority - The priority value (0, 1, 2)
 * @returns Priority label ('high', 'medium', 'low')
 */
export function getPriorityLabel(priority: number): 'high' | 'medium' | 'low' {
  if (priority >= 2) return 'high'
  if (priority === 1) return 'medium'
  return 'low'
}

/**
 * Extracts a tag from a task and its note
 * @param task - The task to extract tag from
 * @param note - The note containing the task
 * @returns Extracted tag string
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
 * Flattens all tasks from notes and creates a task-note map
 * @param notes - Array of notes
 * @returns Object containing all tasks and task-note map
 */
export function flattenTasks(notes: Note[]): {
  allTasks: Task[]
  taskNoteMap: Map<Task, Note>
} {
  const allTasks: Task[] = []
  const taskNoteMap = new Map<Task, Note>()

  notes.forEach((note) => {
    note.tasks.forEach((task) => {
      allTasks.push(task)
      taskNoteMap.set(task, note)
    })
  })

  return { allTasks, taskNoteMap }
}

/**
 * Calculates daily completed tasks for a given date range
 * @param completedTasks - Array of completed tasks
 * @param startDate - Start date of the range
 * @param endDate - End date of the range
 * @returns Array of daily completed tasks
 */
export function calculateDailyCompleted(
  completedTasks: Task[],
  startDate: Dayjs,
  endDate: Dayjs
): DailyCompletedTasks[] {
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
 * Calculates priority distribution of tasks
 * @param tasks - Array of tasks to calculate distribution for
 * @returns Priority distribution data
 */
export function calculatePriorityDistribution(tasks: Task[]): PriorityDistribution {
  const distribution: PriorityDistribution = {
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
      distribution.high++
      distribution.highTasks.push(task)
    } else if (priority === 'medium') {
      distribution.medium++
      distribution.mediumTasks.push(task)
    } else {
      distribution.low++
      distribution.lowTasks.push(task)
    }
  })

  return distribution
}

/**
 * Calculates tag distribution of tasks
 * @param tasks - Array of tasks to calculate distribution for
 * @param taskNoteMap - Map of tasks to their notes
 * @returns Array of tag distribution data
 */
export function calculateTagDistribution(
  tasks: Task[],
  taskNoteMap: Map<Task, Note>
): TagDistribution[] {
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
 * Calculates complete statistics data
 * @param notes - Array of notes
 * @param dateRange - Date range for statistics
 * @returns Complete statistics data
 */
export function calculateStatistics(
  notes: Note[],
  dateRange: { start: Dayjs; end: Dayjs }
): StatisticsData {
  const { allTasks, taskNoteMap } = flattenTasks(notes)

  const completedTasks = allTasks.filter((t) => t.finishedAt !== null)
  const incompleteTasks = allTasks.filter((t) => t.finishedAt === null)

  const dailyCompleted = calculateDailyCompleted(completedTasks, dateRange.start, dateRange.end)
  const priorityDistribution = calculatePriorityDistribution(incompleteTasks)
  const tagDistribution = calculateTagDistribution(incompleteTasks, taskNoteMap)

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
 * Filters tasks by priority
 * @param tasks - Array of tasks to filter
 * @param priority - Priority to filter by ('high', 'medium', 'low', or null for all)
 * @returns Filtered tasks array
 */
export function filterTasksByPriority(
  tasks: Task[],
  priority: 'high' | 'medium' | 'low' | null
): Task[] {
  if (!priority) return tasks
  return tasks.filter((task) => getPriorityLabel(task.priority) === priority)
}

/**
 * Filters tasks by date
 * @param tasks - Array of tasks to filter
 * @param date - Date to filter by (YYYY-MM-DD format)
 * @param dateField - Field to use for date comparison ('finishedAt' or 'createdAt')
 * @returns Filtered tasks array
 */
export function filterTasksByDate(
  tasks: Task[],
  date: string,
  dateField: 'finishedAt' | 'createdAt' = 'finishedAt'
): Task[] {
  return tasks.filter((task) => {
    const taskDate = task[dateField]
    if (!taskDate) return false
    return dayjs(taskDate).format('YYYY-MM-DD') === date
  })
}

/**
 * Sorts tasks by date
 * @param tasks - Array of tasks to sort
 * @param sortBy - Sort criteria ('createdAt' or 'finishedAt')
 * @param order - Sort order ('asc' or 'desc')
 * @returns Sorted tasks array
 */
export function sortTasksByDate(
  tasks: Task[],
  sortBy: 'createdAt' | 'finishedAt' = 'createdAt',
  order: 'asc' | 'desc' = 'desc'
): Task[] {
  return [...tasks].sort((a, b) => {
    const dateA = dayjs(a[sortBy] || a.createdAt)
    const dateB = dayjs(b[sortBy] || b.createdAt)
    return order === 'desc' ? dateB.diff(dateA) : dateA.diff(dateB)
  })
}

/**
 * Filters tasks by search query
 * @param tasks - Array of tasks to filter
 * @param query - Search query string
 * @returns Filtered tasks array
 */
export function searchTasks(tasks: Task[], query: string): Task[] {
  if (!query.trim()) return tasks
  const lowerQuery = query.toLowerCase()
  return tasks.filter(
    (task) =>
      task.content?.toLowerCase().includes(lowerQuery) ||
      task.description?.toLowerCase().includes(lowerQuery)
  )
}

/**
 * Filters daily completed tasks by tag
 * @param dailyCompleted - Array of daily completed tasks
 * @param tag - Tag to filter by
 * @param taskNoteMap - Map of tasks to their notes
 * @returns Filtered daily completed tasks for the specific tag
 */
export function filterDailyCompletedByTag(
  dailyCompleted: DailyCompletedTasks[],
  tag: string,
  taskNoteMap: Map<Task, Note>
): DailyCompletedTasks[] {
  return dailyCompleted.map((day) => ({
    ...day,
    tasks: day.tasks.filter((task) => {
      const note = taskNoteMap.get(task)
      const taskTag = extractTagFromTask(task, note)
      return taskTag === tag
    }),
    count: day.tasks.filter((task) => {
      const note = taskNoteMap.get(task)
      const taskTag = extractTagFromTask(task, note)
      return taskTag === tag
    }).length
  }))
}
