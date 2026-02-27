import { createSelector } from '@reduxjs/toolkit'
import dayjs from 'dayjs'
import { Note, Task } from '@/interfaces'

export type TaskWithNote = Task & {
  noteId: number
  noteName: string | null
  notePriority: number
}

export type DailyCompletedStats = {
  date: string
  count: number
  tasks: TaskWithNote[]
}

export type TagDistribution = {
  tagName: string
  count: number
  tasks: TaskWithNote[]
}

export type PriorityStats = {
  priority: 'high' | 'medium' | 'low'
  count: number
  tasks: TaskWithNote[]
}

export type StatisticsData = {
  dailyCompleted: DailyCompletedStats[]
  tagDistribution: TagDistribution[]
  priorityStats: PriorityStats[]
  allTasks: TaskWithNote[]
}

const PRIORITY_MAP: Record<number, 'high' | 'medium' | 'low'> = {
  2: 'high',
  1: 'medium',
  0: 'low'
}

const PRIORITY_LABELS: Record<string, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low'
}

export const getPriorityLabel = (priority: number): 'high' | 'medium' | 'low' => {
  return PRIORITY_MAP[priority] || 'low'
}

export const getPriorityValue = (label: 'high' | 'medium' | 'low'): number => {
  const map: Record<string, number> = { high: 2, medium: 1, low: 0 }
  return map[label] ?? 0
}

export const selectAllTasksFromNotes = (notes: Note[]): TaskWithNote[] => {
  const tasks: TaskWithNote[] = []
  notes.forEach((note) => {
    note.tasks?.forEach((task) => {
      tasks.push({
        ...task,
        noteId: note.id,
        noteName: note.name,
        notePriority: note.priority
      })
    })
  })
  return tasks
}

export const selectCompletedTasks = createSelector([(tasks: TaskWithNote[]) => tasks], (tasks) =>
  tasks.filter((task) => task.finishedAt !== null)
)

export const selectUncompletedTasks = createSelector([(tasks: TaskWithNote[]) => tasks], (tasks) =>
  tasks.filter((task) => task.finishedAt === null)
)

export const calculateDailyCompletedStats = (
  tasks: TaskWithNote[],
  startDate: Date,
  endDate: Date
): DailyCompletedStats[] => {
  const stats: DailyCompletedStats[] = []
  const completedTasks = tasks.filter((task) => task.finishedAt !== null)

  let current = dayjs(startDate).startOf('day')
  const end = dayjs(endDate).endOf('day')

  while (current.isBefore(end) || current.isSame(end, 'day')) {
    const dateStr = current.format('YYYY-MM-DD')
    const dayTasks = completedTasks.filter((task) => {
      if (!task.finishedAt) return false
      return dayjs(task.finishedAt).format('YYYY-MM-DD') === dateStr
    })

    stats.push({
      date: dateStr,
      count: dayTasks.length,
      tasks: dayTasks
    })

    current = current.add(1, 'day')
  }

  return stats
}

export const calculateTagDistribution = (tasks: TaskWithNote[]): TagDistribution[] => {
  const tagMap = new Map<string, TaskWithNote[]>()

  tasks.forEach((task) => {
    const tagName = task.noteName || 'Untitled'
    if (!tagMap.has(tagName)) {
      tagMap.set(tagName, [])
    }
    tagMap.get(tagName)!.push(task)
  })

  return Array.from(tagMap.entries())
    .map(([tagName, tagTasks]) => ({
      tagName,
      count: tagTasks.length,
      tasks: tagTasks
    }))
    .sort((a, b) => b.count - a.count)
}

export const calculatePriorityStats = (tasks: TaskWithNote[]): PriorityStats[] => {
  const priorityMap = new Map<'high' | 'medium' | 'low', TaskWithNote[]>()

  tasks.forEach((task) => {
    const priority = getPriorityLabel(task.notePriority)
    if (!priorityMap.has(priority)) {
      priorityMap.set(priority, [])
    }
    priorityMap.get(priority)!.push(task)
  })

  const priorities: ('high' | 'medium' | 'low')[] = ['high', 'medium', 'low']
  return priorities.map((priority) => ({
    priority,
    count: priorityMap.get(priority)?.length || 0,
    tasks: priorityMap.get(priority) || []
  }))
}

export const filterTasksByDate = (tasks: TaskWithNote[], date: string | null): TaskWithNote[] => {
  if (!date) return tasks
  return tasks.filter((task) => {
    if (!task.finishedAt) return false
    return dayjs(task.finishedAt).format('YYYY-MM-DD') === date
  })
}

export const filterTasksByTag = (tasks: TaskWithNote[], tagName: string | null): TaskWithNote[] => {
  if (!tagName) return tasks
  return tasks.filter((task) => (task.noteName || 'Untitled') === tagName)
}

export const filterTasksByPriority = (
  tasks: TaskWithNote[],
  priority: 'high' | 'medium' | 'low' | null
): TaskWithNote[] => {
  if (!priority) return tasks
  return tasks.filter((task) => getPriorityLabel(task.notePriority) === priority)
}

export const generateCSVData = (
  dailyStats: DailyCompletedStats[],
  tagDistribution: TagDistribution[],
  priorityStats: PriorityStats[]
) => {
  const csvRows: string[][] = []

  csvRows.push(['Daily Completed Tasks'])
  csvRows.push(['Date', 'Count'])
  dailyStats.forEach((stat) => {
    csvRows.push([stat.date, stat.count.toString()])
  })

  csvRows.push([])
  csvRows.push(['Tag Distribution (Uncompleted Tasks)'])
  csvRows.push(['Tag', 'Count'])
  tagDistribution.forEach((tag) => {
    csvRows.push([tag.tagName, tag.count.toString()])
  })

  csvRows.push([])
  csvRows.push(['Priority Statistics'])
  csvRows.push(['Priority', 'Count'])
  priorityStats.forEach((stat) => {
    csvRows.push([PRIORITY_LABELS[stat.priority], stat.count.toString()])
  })

  return csvRows
}

export { PRIORITY_LABELS }
