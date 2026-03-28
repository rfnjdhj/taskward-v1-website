import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { createSelector } from 'reselect'
import dayjs, { Dayjs } from 'dayjs'
import { Note, Task } from '@/interfaces'
import {
  calculateStatistics,
  filterTasksByPriority,
  filterTasksBySearch,
  sortTasksByDate,
  PriorityType,
  SortType,
  StatisticsData
} from '@/utils/statistics'

interface StatisticsState {
  dateRangeType: 'last7' | 'last30' | 'custom'
  customDateRange: { start: string; end: string }
  selectedDate: string | null
  selectedTag: string | null
  selectedPriority: PriorityType | null
  searchTerm: string
  sortType: SortType
}

const initialState: StatisticsState = {
  dateRangeType: 'last30',
  customDateRange: {
    start: dayjs().subtract(29, 'day').format('YYYY-MM-DD'),
    end: dayjs().format('YYYY-MM-DD')
  },
  selectedDate: null,
  selectedTag: null,
  selectedPriority: null,
  searchTerm: '',
  sortType: 'newest'
}

const statisticsSlice = createSlice({
  name: 'statistics',
  initialState,
  reducers: {
    setDateRangeType: (state, action: PayloadAction<'last7' | 'last30' | 'custom'>) => {
      state.dateRangeType = action.payload
    },
    setCustomDateRange: (state, action: PayloadAction<{ start: string; end: string }>) => {
      state.customDateRange = action.payload
    },
    setSelectedDate: (state, action: PayloadAction<string | null>) => {
      state.selectedDate = action.payload
    },
    setSelectedTag: (state, action: PayloadAction<string | null>) => {
      state.selectedTag = action.payload
    },
    setSelectedPriority: (state, action: PayloadAction<PriorityType | null>) => {
      state.selectedPriority = action.payload
    },
    setSearchTerm: (state, action: PayloadAction<string>) => {
      state.searchTerm = action.payload
    },
    setSortType: (state, action: PayloadAction<SortType>) => {
      state.sortType = action.payload
    },
    resetFilters: (state) => {
      state.selectedDate = null
      state.selectedTag = null
      state.selectedPriority = null
      state.searchTerm = ''
      state.sortType = 'newest'
    }
  }
})

export const statisticsAction = statisticsSlice.actions
export default statisticsSlice.reducer

const selectStatisticsState = (state: { statistics: StatisticsState }) => state.statistics

export const selectDateRange = createSelector([selectStatisticsState], (statisticsState) => {
  if (statisticsState.dateRangeType === 'last7') {
    return {
      start: dayjs().subtract(6, 'day'),
      end: dayjs()
    }
  }
  if (statisticsState.dateRangeType === 'last30') {
    return {
      start: dayjs().subtract(29, 'day'),
      end: dayjs()
    }
  }
  return {
    start: dayjs(statisticsState.customDateRange.start),
    end: dayjs(statisticsState.customDateRange.end)
  }
})

export const selectStatistics = createSelector(
  [
    (state: { statistics: StatisticsState }, notes: Note[]) => notes,
    (state: { statistics: StatisticsState }) => selectDateRange(state)
  ],
  (notes, dateRange): StatisticsData => {
    return calculateStatistics(notes, dateRange)
  }
)

export const selectFilteredTagTasks = createSelector(
  [
    (state: { statistics: StatisticsState }, tasks: Task[]) => tasks,
    (state: { statistics: StatisticsState }) => state.statistics.selectedPriority,
    (state: { statistics: StatisticsState }) => state.statistics.sortType
  ],
  (tasks, selectedPriority, sortType) => {
    let filtered = filterTasksByPriority(tasks, selectedPriority)
    filtered = sortTasksByDate(filtered, sortType)
    return filtered
  }
)

export const selectFilteredPriorityTasks = createSelector(
  [
    (state: { statistics: StatisticsState }, tasks: Task[]) => tasks,
    (state: { statistics: StatisticsState }) => state.statistics.searchTerm,
    (state: { statistics: StatisticsState }) => state.statistics.sortType
  ],
  (tasks, searchTerm, sortType) => {
    let filtered = filterTasksBySearch(tasks, searchTerm)
    filtered = sortTasksByDate(filtered, sortType)
    return filtered
  }
)

export const selectSelectedDate = createSelector(
  [selectStatisticsState],
  (state) => state.selectedDate
)

export const selectSelectedTag = createSelector(
  [selectStatisticsState],
  (state) => state.selectedTag
)

export const selectSelectedPriority = createSelector(
  [selectStatisticsState],
  (state) => state.selectedPriority
)

export const selectSearchTerm = createSelector([selectStatisticsState], (state) => state.searchTerm)

export const selectSortType = createSelector([selectStatisticsState], (state) => state.sortType)
