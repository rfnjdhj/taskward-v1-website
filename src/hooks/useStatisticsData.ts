import { useMemo } from 'react'
import dayjs, { Dayjs } from 'dayjs'
import { Note } from '@/interfaces'
import {
  calculateStatistics,
  StatisticsData,
  DailyCompletedTasks,
  PriorityDistribution,
  TagDistribution
} from '@/utils/statistics'

export { DailyCompletedTasks, PriorityDistribution, TagDistribution, StatisticsData }

export function useStatisticsData(
  notes: Note[] | undefined,
  dateRange: { start: Dayjs; end: Dayjs } | null
): StatisticsData {
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

    const endDate = dateRange?.end ?? dayjs()
    const startDate = dateRange?.start ?? dayjs().subtract(29, 'day')

    return calculateStatistics(notes, { start: startDate, end: endDate })
  }, [notes, dateRange])
}
