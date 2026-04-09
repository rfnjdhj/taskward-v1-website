import { useQuery } from '@tanstack/react-query'
import { axiosService, NOTES_KEY } from '@/requests'

import { Notes } from '@/interfaces'

/**
 * 获取笔记列表的请求 Hook
 * @returns 包含数据、刷新函数和加载状态的对象
 */
const useGetNotesRequest = () => {
  const { data, refetch, isLoading, isRefetching } = useQuery(
    [NOTES_KEY],
    async (): Promise<Notes> => {
      const response = await axiosService({
        method: 'GET',
        url: 'notes'
      })
      return response.data
    },
    {
      staleTime: 0,
      cacheTime: 0
    }
  )

  /**
   * 强制刷新数据，跳过缓存
   * @returns Promise<void>
   */
  const forceRefetch = async (): Promise<void> => {
    await refetch({ cancelRefetch: true })
  }

  return { data, refetch: forceRefetch, isLoading, isRefetching }
}

export default useGetNotesRequest
