import dayjs from 'dayjs'
import {
  getTaskCompletedDate,
  getPriorityLabel,
  extractTagFromTask,
  aggregateTasksByDate,
  groupTasksByPriority,
  groupTasksByTag,
  filterTasksByDateRange,
  filterTasksByPriority,
  filterTasksBySearch,
  sortTasksByDate,
  calculateStatistics,
  statisticsToCSV
} from '@/utils/statistics'
import type { Task, Note } from '@/interfaces'

describe('statistics utils', () => {
  const createMockTask = (overrides: Partial<Task> = {}): Task => ({
    id: 1,
    content: 'Test task',
    linkUrl: null,
    createdAt: new Date('2024-01-15'),
    updatedAt: null,
    finishedAt: null,
    priority: 1,
    index: 0,
    ...overrides
  })

  const createMockNote = (overrides: Partial<Note> = {}): Note => ({
    id: 1,
    name: 'Test Note',
    description: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: null,
    deletedAt: null,
    priority: 1,
    index: 0,
    toped: false,
    tasks: [],
    ...overrides
  })

  describe('getTaskCompletedDate', () => {
    it('should return null for unfinished task', () => {
      const task = createMockTask()
      expect(getTaskCompletedDate(task)).toBeNull()
    })

    it('should return Dayjs object for finished task', () => {
      const finishedAt = new Date('2024-01-20')
      const task = createMockTask({ finishedAt })
      const result = getTaskCompletedDate(task)
      expect(result).not.toBeNull()
      expect(result?.format('YYYY-MM-DD')).toBe('2024-01-20')
    })
  })

  describe('getPriorityLabel', () => {
    it('should return high for priority >= 2', () => {
      expect(getPriorityLabel(2)).toBe('high')
      expect(getPriorityLabel(5)).toBe('high')
    })

    it('should return medium for priority === 1', () => {
      expect(getPriorityLabel(1)).toBe('medium')
    })

    it('should return low for priority < 1', () => {
      expect(getPriorityLabel(0)).toBe('low')
      expect(getPriorityLabel(-1)).toBe('low')
    })
  })

  describe('extractTagFromTask', () => {
    it('should extract tag from note name', () => {
      const task = createMockTask()
      const note = createMockNote({ name: 'Work Project' })
      expect(extractTagFromTask(task, note)).toBe('Work')
    })

    it('should truncate long tag from note name', () => {
      const task = createMockTask()
      const note = createMockNote({ name: 'ThisIsAVeryLongNoteName' })
      expect(extractTagFromTask(task, note)).toBe('ThisIsAVeryLong...')
    })

    it('should extract tag from task content when note name is not available', () => {
      const task = createMockTask({ content: 'Buy groceries' })
      const note = createMockNote({ name: null })
      expect(extractTagFromTask(task, note)).toBe('Buy')
    })

    it('should return Untitled when no content available', () => {
      const task = createMockTask({ content: null })
      const note = createMockNote({ name: null })
      expect(extractTagFromTask(task, note)).toBe('Untitled')
    })
  })

  describe('aggregateTasksByDate', () => {
    it('should return empty array for no tasks', () => {
      const startDate = dayjs('2024-01-01')
      const endDate = dayjs('2024-01-03')
      const result = aggregateTasksByDate([], startDate, endDate)
      expect(result).toHaveLength(3)
      expect(result[0].count).toBe(0)
      expect(result[1].count).toBe(0)
      expect(result[2].count).toBe(0)
    })

    it('should count completed tasks by date', () => {
      const startDate = dayjs('2024-01-15')
      const endDate = dayjs('2024-01-17')
      const tasks = [
        createMockTask({ finishedAt: new Date('2024-01-15') }),
        createMockTask({ finishedAt: new Date('2024-01-15') }),
        createMockTask({ finishedAt: new Date('2024-01-16') }),
        createMockTask()
      ]
      const result = aggregateTasksByDate(tasks, startDate, endDate)
      expect(result).toHaveLength(3)
      expect(result[0].date).toBe('2024-01-15')
      expect(result[0].count).toBe(2)
      expect(result[1].date).toBe('2024-01-16')
      expect(result[1].count).toBe(1)
      expect(result[2].date).toBe('2024-01-17')
      expect(result[2].count).toBe(0)
    })
  })

  describe('groupTasksByPriority', () => {
    it('should return zero counts for no tasks', () => {
      const result = groupTasksByPriority([])
      expect(result.high).toBe(0)
      expect(result.medium).toBe(0)
      expect(result.low).toBe(0)
      expect(result.highTasks).toHaveLength(0)
      expect(result.mediumTasks).toHaveLength(0)
      expect(result.lowTasks).toHaveLength(0)
    })

    it('should group tasks by priority', () => {
      const tasks = [
        createMockTask({ priority: 2 }),
        createMockTask({ priority: 2 }),
        createMockTask({ priority: 1 }),
        createMockTask({ priority: 0 })
      ]
      const result = groupTasksByPriority(tasks)
      expect(result.high).toBe(2)
      expect(result.medium).toBe(1)
      expect(result.low).toBe(1)
      expect(result.highTasks).toHaveLength(2)
      expect(result.mediumTasks).toHaveLength(1)
      expect(result.lowTasks).toHaveLength(1)
    })
  })

  describe('groupTasksByTag', () => {
    it('should return empty array for no tasks', () => {
      const result = groupTasksByTag([], new Map())
      expect(result).toEqual([])
    })

    it('should group tasks by tag', () => {
      const task1 = createMockTask({ content: 'Work task 1' })
      const task2 = createMockTask({ content: 'Work task 2' })
      const task3 = createMockTask({ content: 'Home task' })
      const taskNoteMap = new Map<Task, Note>()
      taskNoteMap.set(task1, createMockNote())
      taskNoteMap.set(task2, createMockNote())
      taskNoteMap.set(task3, createMockNote())

      const result = groupTasksByTag([task1, task2, task3], taskNoteMap)
      expect(result).toHaveLength(1)
      expect(result[0].tag).toBe('Test')
      expect(result[0].count).toBe(3)
    })
  })

  describe('filterTasksByDateRange', () => {
    it('should filter tasks by date range', () => {
      const startDate = dayjs('2024-01-10')
      const endDate = dayjs('2024-01-20')
      const tasks = [
        createMockTask({ createdAt: new Date('2024-01-15') }),
        createMockTask({ createdAt: new Date('2024-01-25') }),
        createMockTask({ createdAt: new Date('2024-01-05') })
      ]
      const result = filterTasksByDateRange(tasks, startDate, endDate)
      expect(result).toHaveLength(1)
    })
  })

  describe('filterTasksByPriority', () => {
    it('should return all tasks when priority is null', () => {
      const tasks = [createMockTask(), createMockTask()]
      const result = filterTasksByPriority(tasks, null)
      expect(result).toHaveLength(2)
    })

    it('should filter tasks by priority', () => {
      const tasks = [
        createMockTask({ priority: 2 }),
        createMockTask({ priority: 1 }),
        createMockTask({ priority: 0 })
      ]
      const result = filterTasksByPriority(tasks, 'high')
      expect(result).toHaveLength(1)
      expect(result[0].priority).toBe(2)
    })
  })

  describe('filterTasksBySearch', () => {
    it('should return all tasks when search term is empty', () => {
      const tasks = [createMockTask(), createMockTask()]
      const result = filterTasksBySearch(tasks, '')
      expect(result).toHaveLength(2)
    })

    it('should filter tasks by search term', () => {
      const tasks = [
        createMockTask({ content: 'Buy milk' }),
        createMockTask({ content: 'Buy eggs' }),
        createMockTask({ content: 'Do laundry' })
      ]
      const result = filterTasksBySearch(tasks, 'buy')
      expect(result).toHaveLength(2)
    })
  })

  describe('sortTasksByDate', () => {
    it('should sort tasks by newest first', () => {
      const tasks = [
        createMockTask({ createdAt: new Date('2024-01-15') }),
        createMockTask({ createdAt: new Date('2024-01-20') }),
        createMockTask({ createdAt: new Date('2024-01-10') })
      ]
      const result = sortTasksByDate(tasks, 'newest')
      expect(result[0].createdAt).toEqual(new Date('2024-01-20'))
      expect(result[1].createdAt).toEqual(new Date('2024-01-15'))
      expect(result[2].createdAt).toEqual(new Date('2024-01-10'))
    })

    it('should sort tasks by oldest first', () => {
      const tasks = [
        createMockTask({ createdAt: new Date('2024-01-15') }),
        createMockTask({ createdAt: new Date('2024-01-20') }),
        createMockTask({ createdAt: new Date('2024-01-10') })
      ]
      const result = sortTasksByDate(tasks, 'oldest')
      expect(result[0].createdAt).toEqual(new Date('2024-01-10'))
      expect(result[1].createdAt).toEqual(new Date('2024-01-15'))
      expect(result[2].createdAt).toEqual(new Date('2024-01-20'))
    })
  })

  describe('calculateStatistics', () => {
    it('should return empty statistics for no notes', () => {
      const dateRange = { start: dayjs('2024-01-01'), end: dayjs('2024-01-31') }
      const result = calculateStatistics([], dateRange)
      expect(result.totalTasks).toBe(0)
      expect(result.completedTasks).toBe(0)
      expect(result.incompleteTasks).toBe(0)
    })

    it('should calculate statistics correctly', () => {
      const note = createMockNote({
        tasks: [
          createMockTask({ finishedAt: new Date('2024-01-15') }),
          createMockTask({ priority: 2 }),
          createMockTask({ priority: 1 })
        ]
      })
      const dateRange = { start: dayjs('2024-01-01'), end: dayjs('2024-01-31') }
      const result = calculateStatistics([note], dateRange)
      expect(result.totalTasks).toBe(3)
      expect(result.completedTasks).toBe(1)
      expect(result.incompleteTasks).toBe(2)
      expect(result.priorityDistribution.high).toBe(1)
      expect(result.priorityDistribution.medium).toBe(1)
    })
  })

  describe('statisticsToCSV', () => {
    it('should convert statistics to CSV format', () => {
      const statistics = {
        dailyCompleted: [
          { date: '2024-01-15', count: 2, tasks: [] },
          { date: '2024-01-16', count: 1, tasks: [] }
        ],
        priorityDistribution: {
          high: 1,
          medium: 2,
          low: 3,
          highTasks: [],
          mediumTasks: [],
          lowTasks: []
        },
        tagDistribution: [
          { tag: 'Work', count: 5, tasks: [] },
          { tag: 'Home', count: 3, tasks: [] }
        ],
        totalTasks: 10,
        completedTasks: 3,
        incompleteTasks: 7
      }
      const translations = {
        completedTasksLabel: 'Completed Tasks',
        dateLabel: 'Date',
        countLabel: 'Count',
        priorityDistributionLabel: 'Priority Distribution',
        highLabel: 'High',
        mediumLabel: 'Medium',
        lowLabel: 'Low',
        tagDistributionLabel: 'Tag Distribution'
      }
      const csv = statisticsToCSV(statistics, translations)
      expect(csv).toContain('2024-01-15')
      expect(csv).toContain('2024-01-16')
      expect(csv).toContain('High,1')
      expect(csv).toContain('Medium,2')
      expect(csv).toContain('Low,3')
      expect(csv).toContain('Work,5')
      expect(csv).toContain('Home,3')
    })
  })
})
