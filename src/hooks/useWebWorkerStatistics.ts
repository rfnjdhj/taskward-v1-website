import { useRef, useEffect, useCallback, useState } from 'react'
import { Dayjs } from 'dayjs'
import { Note } from '@/interfaces'
import { StatisticsData } from '@/utils/statistics'

// Worker message types
type WorkerResponse =
  | { type: 'CALCULATE_STATISTICS_SUCCESS'; payload: StatisticsData }
  | { type: 'FILTER_DAILY_COMPLETED_BY_TAG_SUCCESS'; payload: any[] }
  | { type: 'ERROR'; payload: Error }

export function useWebWorkerStatistics() {
  const workerRef = useRef<Worker | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Initialize worker
  useEffect(() => {
    try {
      // Create worker using Vite's module worker syntax
      workerRef.current = new Worker(new URL('@/workers/statistics.worker.ts', import.meta.url), {
        type: 'module'
      })

      // Cleanup worker on unmount
      return () => {
        if (workerRef.current) {
          workerRef.current.terminate()
          workerRef.current = null
        }
      }
    } catch (err) {
      console.error('Failed to initialize Web Worker:', err)
    }
  }, [])

  // Calculate statistics using Web Worker
  const calculateStatisticsAsync = useCallback(
    (notes: Note[], dateRange: { start: Dayjs; end: Dayjs }): Promise<StatisticsData> => {
      return new Promise((resolve, reject) => {
        if (!workerRef.current) {
          reject(new Error('Web Worker not initialized'))
          return
        }

        setIsLoading(true)
        setError(null)

        const handleMessage = (e: MessageEvent<WorkerResponse>) => {
          setIsLoading(false)

          switch (e.data.type) {
            case 'CALCULATE_STATISTICS_SUCCESS':
              resolve(e.data.payload)
              break
            case 'ERROR':
              setError(e.data.payload)
              reject(e.data.payload)
              break
          }

          // Cleanup listener
          workerRef.current?.removeEventListener('message', handleMessage)
        }

        const handleError = (err: ErrorEvent) => {
          setIsLoading(false)
          const error = new Error(err.message || 'Web Worker error')
          setError(error)
          reject(error)
          workerRef.current?.removeEventListener('error', handleError)
        }

        workerRef.current.addEventListener('message', handleMessage)
        workerRef.current.addEventListener('error', handleError)

        // Send message to worker
        workerRef.current.postMessage({
          type: 'CALCULATE_STATISTICS',
          payload: {
            notes,
            dateRange: {
              start: dateRange.start.toISOString(),
              end: dateRange.end.toISOString()
            }
          }
        })
      })
    },
    []
  )

  // Filter daily completed by tag using Web Worker
  const filterDailyCompletedByTagAsync = useCallback(
    (dailyCompleted: any[], tag: string, notes: Note[]): Promise<any[]> => {
      return new Promise((resolve, reject) => {
        if (!workerRef.current) {
          reject(new Error('Web Worker not initialized'))
          return
        }

        setIsLoading(true)
        setError(null)

        const handleMessage = (e: MessageEvent<WorkerResponse>) => {
          setIsLoading(false)

          switch (e.data.type) {
            case 'FILTER_DAILY_COMPLETED_BY_TAG_SUCCESS':
              resolve(e.data.payload)
              break
            case 'ERROR':
              setError(e.data.payload)
              reject(e.data.payload)
              break
          }

          // Cleanup listener
          workerRef.current?.removeEventListener('message', handleMessage)
        }

        const handleError = (err: ErrorEvent) => {
          setIsLoading(false)
          const error = new Error(err.message || 'Web Worker error')
          setError(error)
          reject(error)
          workerRef.current?.removeEventListener('error', handleError)
        }

        workerRef.current.addEventListener('message', handleMessage)
        workerRef.current.addEventListener('error', handleError)

        // Send message to worker
        workerRef.current.postMessage({
          type: 'FILTER_DAILY_COMPLETED_BY_TAG',
          payload: {
            dailyCompleted,
            tag,
            notes
          }
        })
      })
    },
    []
  )

  return {
    calculateStatisticsAsync,
    filterDailyCompletedByTagAsync,
    isLoading,
    error
  }
}
