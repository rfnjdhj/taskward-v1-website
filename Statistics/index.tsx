import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useGetNotesRequest } from '@/requests'
import { Note, Task } from '@/interfaces'
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
import { Icon } from '@/components'
import styles from './styles.module.css'

interface DailyTaskData {
  date: string
  completed: number
}

interface PriorityData {
  name: string
  value: number
}

interface EfficiencyData {
  week: string
  completed: number
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

const PRIORITY_NAMES = {
  1: 'High',
  2: 'Medium',
  3: 'Low'
}

export default function Statistics(): JSX.Element {
  const { t } = useTranslation(['layout'])
  const { data: notes } = useGetNotesRequest()
  const [refreshKey, setRefreshKey] = useState(0)

  const [dailyData, setDailyData] = useState<DailyTaskData[]>([])
  const [priorityData, setPriorityData] = useState<PriorityData[]>([])
  const [efficiencyData, setEfficiencyData] = useState<EfficiencyData[]>([])

  useEffect(() => {
    if (!notes?.notes) return

    const allTasks: Task[] = []
    notes.notes.forEach((note: Note) => {
      if (note.tasks) {
        allTasks.push(...note.tasks)
      }
    })

    // Calculate daily task completion trend
    const dailyStats: Record<string, number> = {}
    const today = new Date()
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      dailyStats[dateStr] = 0
    }

    allTasks.forEach((task: Task) => {
      if (task.finishedAt) {
        const finishedDate = new Date(task.finishedAt)
        const dateStr = finishedDate.toISOString().split('T')[0]
        if (dailyStats[dateStr] !== undefined) {
          dailyStats[dateStr]++
        }
      }
    })

    const dailyDataArray: DailyTaskData[] = Object.entries(dailyStats).map(([date, completed]) => ({
      date,
      completed
    }))
    setDailyData(dailyDataArray)

    // Calculate priority statistics
    const priorityStats: Record<number, number> = { 1: 0, 2: 0, 3: 0 }
    allTasks.forEach((task: Task) => {
      if (task.priority) {
        priorityStats[task.priority]++
      }
    })

    const priorityDataArray: PriorityData[] = Object.entries(priorityStats).map(([priority, value]) => ({
      name: PRIORITY_NAMES[parseInt(priority)],
      value
    }))
    setPriorityData(priorityDataArray)

    // Calculate efficiency data
    const currentWeekCompleted = allTasks.filter((task: Task) => {
      if (!task.finishedAt) return false
      const finishedDate = new Date(task.finishedAt)
      const weekAgo = new Date(today)
      weekAgo.setDate(weekAgo.getDate() - 7)
      return finishedDate >= weekAgo
    }).length

    const lastWeekCompleted = allTasks.filter((task: Task) => {
      if (!task.finishedAt) return false
      const finishedDate = new Date(task.finishedAt)
      const weekAgo = new Date(today)
      weekAgo.setDate(weekAgo.getDate() - 7)
      const twoWeeksAgo = new Date(today)
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
      return finishedDate >= twoWeeksAgo && finishedDate < weekAgo
    }).length

    setEfficiencyData([
      { week: 'Last Week', completed: lastWeekCompleted },
      { week: 'This Week', completed: currentWeekCompleted }
    ])
  }, [notes, refreshKey])

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }

  if (!notes?.notes) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Icon.Loading className="animate-spin h-12 w-12 mx-auto mb-4" />
          <p className="text-lg">{t('layout:STATISTICS.LOADING')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{t('layout:STATISTICS.TITLE')}</h1>
        <button
          onClick={handleRefresh}
          className="btn btn-primary flex items-center gap-2"
        >
          <Icon.Refresh className="h-5 w-5" />
          {t('layout:STATISTICS.REFRESH')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">{t('layout:STATISTICS.DAILY_TREND')}</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="completed" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">{t('layout:STATISTICS.PRIORITY_DISTRIBUTION')}</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={priorityData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">{t('layout:STATISTICS.PRIORITY_STATISTICS')}</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priorityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">{t('layout:STATISTICS.WEEKLY_EFFICIENCY')}</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={efficiencyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="completed" fill="#0088FE" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
