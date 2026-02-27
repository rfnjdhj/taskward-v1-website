import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import dayjs from 'dayjs'

import { Modal } from '@/components'
import { Task } from '@/interfaces'

interface TaskListModalProps {
  isOpen: boolean
  onClose: () => void
  tasks: Task[]
  title: string
}

export default function TaskListModal({
  isOpen,
  onClose,
  tasks,
  title
}: TaskListModalProps): JSX.Element {
  const { t } = useTranslation(['statistics'])
  const containerRef = useRef<HTMLDivElement>(null)

  const itemHeight = 72
  const containerHeight = Math.min(tasks.length * itemHeight, 400)

  const getPriorityColor = (priority?: number) => {
    switch (priority) {
      case 2:
        return 'text-red-500'
      case 1:
        return 'text-yellow-500'
      case 0:
        return 'text-blue-500'
      default:
        return 'text-gray-500'
    }
  }

  const getPriorityLabel = (priority?: number) => {
    switch (priority) {
      case 2:
        return t('statistics:STATISTICS.PRIORITY.HIGH')
      case 1:
        return t('statistics:STATISTICS.PRIORITY.MEDIUM')
      case 0:
        return t('statistics:STATISTICS.PRIORITY.LOW')
      default:
        return t('statistics:STATISTICS.PRIORITY.MEDIUM')
    }
  }

  return (
    <Modal
      show={isOpen}
      toggle={onClose}
      modalClassName="w-full max-w-2xl"
    >
      <div className="flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <h3 className="text-lg font-semibold dark:text-white">{title}</h3>
          <button
            onClick={onClose}
            className="btn btn-sm btn-ghost btn-circle"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="px-6 py-2 text-sm text-gray-500 dark:text-gray-400">
          {t('statistics:STATISTICS.TASK_LIST.TASK_COUNT', { count: tasks.length })}
        </div>

        <div
          ref={containerRef}
          className="overflow-y-auto"
          style={{ height: containerHeight, maxHeight: 400 }}
        >
          {tasks.length > 0 ? (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {tasks.map((task, index) => {
                const extendedTask = task as Task & { noteName?: string }
                return (
                  <div
                    key={task.id || index}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <div
                      className={clsx(
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium',
                        getPriorityColor(task.priority)
                      )}
                    >
                      {getPriorityLabel(task.priority).charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium dark:text-white">
                        {task.content || t('statistics:STATISTICS.TASK_LIST.NO_TASKS')}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        {extendedTask.noteName && (
                          <span className="truncate rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-700">
                            {extendedTask.noteName}
                          </span>
                        )}
                        <span>
                          {task.createdAt ? dayjs(task.createdAt).format('MM-DD HH:mm') : ''}
                        </span>
                      </div>
                    </div>
                    {task.finishedAt ? (
                      <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-600 dark:bg-green-900/30 dark:text-green-400">
                        {t('statistics:STATISTICS.SUMMARY.COMPLETED_TASKS')}
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400">
                        {t('statistics:STATISTICS.SUMMARY.PENDING_TASKS')}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center text-gray-500 dark:text-gray-400">
              {t('statistics:STATISTICS.TASK_LIST.NO_TASKS')}
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-gray-200 px-6 py-4 dark:border-gray-700">
          <button
            onClick={onClose}
            className="btn btn-primary"
          >
            {t('statistics:STATISTICS.TASK_LIST.CLOSE')}
          </button>
        </div>
      </div>
    </Modal>
  )
}
