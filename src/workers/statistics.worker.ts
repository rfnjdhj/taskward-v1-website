/// <reference lib="webworker" />

import {
  calculateStatistics,
  StatisticsData,
  filterDailyCompletedByTag,
  flattenTasks
} from '@/utils/statistics'
import { Note } from '@/interfaces'
import dayjs, { Dayjs } from 'dayjs'

// Define message types
type CalculateStatisticsMessage = {
  type: 'CALCULATE_STATISTICS'
  payload: {
    notes: Note[]
    dateRange: { start: string; end: string }
  }
}

type FilterDailyCompletedByTagMessage = {
  type: 'FILTER_DAILY_COMPLETED_BY_TAG'
  payload: {
    dailyCompleted: any[]
    tag: string
    notes: Note[]
  }
}

type WorkerMessage = CalculateStatisticsMessage | FilterDailyCompletedByTagMessage

// Handle incoming messages
self.onmessage = function (e: MessageEvent<WorkerMessage>) {
  try {
    const { type, payload } = e.data

    switch (type) {
      case 'CALCULATE_STATISTICS': {
        const { notes, dateRange } = payload
        const startDate = dayjs(dateRange.start)
        const endDate = dayjs(dateRange.end)

        const statistics = calculateStatistics(notes, { start: startDate, end: endDate })

        self.postMessage({
          type: 'CALCULATE_STATISTICS_SUCCESS',
          payload: statistics
        })
        break
      }

      case 'FILTER_DAILY_COMPLETED_BY_TAG': {
        const { dailyCompleted, tag, notes } = payload
        const { taskNoteMap } = flattenTasks(notes)
        const filtered = filterDailyCompletedByTag(dailyCompleted, tag, taskNoteMap)

        self.postMessage({
          type: 'FILTER_DAILY_COMPLETED_BY_TAG_SUCCESS',
          payload: filtered
        })
        break
      }

      default:
        self.postMessage({
          type: 'ERROR',
          payload: new Error(`Unknown message type: ${type}`)
        })
    }
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      payload: error
    })
  }
}

export {}
