import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { Dayjs } from 'dayjs'
import { Note, Task } from '@/interfaces'
import { selectStatistics, selectDateRange } from '@/store/statisticsSlice'

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

export function useStatisticsData(notes: Note[] | undefined): StatisticsData {
  const dateRange = useSelector(selectDateRange)

  const statistics = useSelector((state) => selectStatistics(state, notes || []))

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

    return statistics
  }, [notes, statistics])
}
