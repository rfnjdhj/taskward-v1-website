import { useRef, useMemo, memo } from 'react'
import { useTranslation } from 'react-i18next'
import { useVirtualizer } from '@tanstack/react-virtual'
import clsx from 'clsx'
import dayjs from 'dayjs'
import { TaskWithNote } from '@/utils'

interface VirtualTaskListProps {
  tasks: TaskWithNote[]
  className?: string
}

const TaskItem = memo(({ task }: { task: TaskWithNote }) => {
  const { t } = useTranslation(['statistics'])
  const priorityColors = {
    high: 'bg-red-500',
    medium: 'bg-yellow-500',
    low: 'bg-green-500'
  }

  const getPriorityColor = (priority: number) => {
    if (priority >= 2) return priorityColors.high
    if (priority === 1) return priorityColors.medium
    return priorityColors.low
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
      <div className={clsx('h-3 w-3 shrink-0 rounded-full', getPriorityColor(task.notePriority))} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-gray-900 dark:text-white">
          {task.content || t('statistics:TASK.NO_CONTENT')}
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span className="truncate">{task.noteName || t('statistics:TAG.UNTITLED')}</span>
          {task.finishedAt && (
            <>
              <span>•</span>
              <span>{dayjs(task.finishedAt).format('YYYY-MM-DD HH:mm')}</span>
            </>
          )}
        </div>
      </div>
      {task.linkUrl && (
        <a
          href={task.linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-blue-500 hover:text-blue-600"
          onClick={(e) => e.stopPropagation()}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </a>
      )}
    </div>
  )
})

TaskItem.displayName = 'TaskItem'

export default function VirtualTaskList({ tasks, className }: VirtualTaskListProps) {
  const { t } = useTranslation(['statistics'])
  const parentRef = useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 5
  })

  const items = useMemo(() => {
    return rowVirtualizer.getVirtualItems()
  }, [rowVirtualizer])

  if (tasks.length === 0) {
    return (
      <div className={clsx('flex h-32 items-center justify-center text-gray-500', className)}>
        {t('statistics:TASK.NO_TASKS')}
      </div>
    )
  }

  return (
    <div
      ref={parentRef}
      className={clsx('h-full overflow-auto', className)}
      style={{ maxHeight: '400px' }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative'
        }}
      >
        {items.map((virtualRow) => (
          <div
            key={virtualRow.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`
            }}
          >
            <TaskItem task={tasks[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  )
}
