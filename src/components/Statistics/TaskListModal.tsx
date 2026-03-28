import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FixedSizeList } from 'react-window'
import { Task } from '@/interfaces'
import { PriorityType, SortType } from '@/utils/statistics'
import { useSelector } from 'react-redux'
import {
  selectSelectedPriority,
  selectSearchTerm,
  selectSortType,
  selectFilteredTagTasks,
  selectFilteredPriorityTasks
} from '@/store/statisticsSlice'

interface TaskListModalProps {
  show: boolean
  onClose: () => void
  title: string
  tasks: Task[]
  type: 'tag' | 'priority'
}

export default function TaskListModal({ show, onClose, title, tasks, type }: TaskListModalProps) {
  const { t } = useTranslation(['statistics'])
  const selectedPriority = useSelector(selectSelectedPriority)
  const searchTerm = useSelector(selectSearchTerm)
  const sortType = useSelector(selectSortType)

  const [localSearchTerm, setLocalSearchTerm] = useState('')
  const [localPriority, setLocalPriority] = useState<PriorityType | null>(null)
  const [localSortType, setLocalSortType] = useState<SortType>('newest')

  const filteredTasks = useMemo(() => {
    let result = [...tasks]

    if (type === 'tag' && localPriority) {
      result = result.filter((task) => {
        if (localPriority === 'high') return task.priority >= 2
        if (localPriority === 'medium') return task.priority === 1
        return task.priority <= 0
      })
    }

    if (type === 'priority' && localSearchTerm) {
      const searchLower = localSearchTerm.toLowerCase()
      result = result.filter((task) => task.content?.toLowerCase().includes(searchLower))
    }

    result.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime()
      const dateB = new Date(b.createdAt).getTime()
      return localSortType === 'newest' ? dateB - dateA : dateA - dateB
    })

    return result
  }, [tasks, type, localPriority, localSearchTerm, localSortType])

  if (!show) return null

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const task = filteredTasks[index]
    return (
      <div
        style={style}
        className="flex items-center border-b border-base-300 px-4 dark:border-gray-700"
      >
        <span className="truncate text-sm text-gray-700 dark:text-gray-300">
          {task.content || t('statistics:TASK_LIST.EMPTY')}
        </span>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-md flex-col rounded-lg bg-white shadow-xl dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-base-300 p-4 dark:border-gray-700">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            className="btn btn-sm btn-circle btn-ghost"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="border-b border-base-300 p-4 dark:border-gray-700">
          {type === 'tag' && (
            <div className="mb-2">
              <label className="label-text mb-1 block font-medium">
                {t('statistics:FILTER.BY_PRIORITY')}
              </label>
              <select
                className="select select-bordered select-sm w-full"
                value={localPriority || ''}
                onChange={(e) => setLocalPriority((e.target.value as PriorityType) || null)}
              >
                <option value="">{t('statistics:PRIORITY.ALL')}</option>
                <option value="high">{t('statistics:PRIORITY.HIGH')}</option>
                <option value="medium">{t('statistics:PRIORITY.MEDIUM')}</option>
                <option value="low">{t('statistics:PRIORITY.LOW')}</option>
              </select>
            </div>
          )}

          {type === 'priority' && (
            <div className="mb-2">
              <label className="label-text mb-1 block font-medium">
                {t('statistics:FILTER.SEARCH')}
              </label>
              <input
                type="text"
                className="input input-bordered input-sm w-full"
                placeholder={t('statistics:FILTER.SEARCH_PLACEHOLDER')}
                value={localSearchTerm}
                onChange={(e) => setLocalSearchTerm(e.target.value)}
              />
            </div>
          )}

          <div>
            <label className="label-text mb-1 block font-medium">
              {t('statistics:FILTER.SORT_BY')}
            </label>
            <select
              className="select select-bordered select-sm w-full"
              value={localSortType}
              onChange={(e) => setLocalSortType(e.target.value as SortType)}
            >
              <option value="newest">{t('statistics:FILTER.NEWEST')}</option>
              <option value="oldest">{t('statistics:FILTER.OLDEST')}</option>
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {filteredTasks.length > 0 ? (
            <FixedSizeList
              height={400}
              width="100%"
              itemCount={filteredTasks.length}
              itemSize={50}
            >
              {Row}
            </FixedSizeList>
          ) : (
            <div className="flex h-40 items-center justify-center text-gray-500">
              {t('statistics:TASK_LIST.EMPTY')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
