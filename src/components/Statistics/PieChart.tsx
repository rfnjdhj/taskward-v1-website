import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { useTranslation } from 'react-i18next'
import { TagDistribution } from '@/utils'

interface PieChartProps {
  data: TagDistribution[]
  selectedTag: string | null
  onTagSelect: (tag: string | null) => void
  className?: string
}

const COLORS = [
  '#10b981',
  '#3b82f6',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
  '#f97316',
  '#6366f1'
]

export default function PieChart({ data, selectedTag, onTagSelect, className }: PieChartProps) {
  const { t, i18n } = useTranslation(['statistics'])

  const option = useMemo(() => {
    const isDark = document.documentElement.classList.contains('dark')

    const pieData = data.map((item, index) => ({
      name: item.tagName,
      value: item.count,
      itemStyle: {
        color: COLORS[index % COLORS.length]
      }
    }))

    return {
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          return `
            <div style="padding: 8px;">
              <div style="font-weight: bold; margin-bottom: 4px;">${params.name}</div>
              <div>${t('statistics:CHART.TASK_COUNT')}: ${params.value}</div>
              <div style="margin-top: 4px; font-size: 12px; color: #666;">${t('statistics:CHART.CLICK_TO_FILTER')}</div>
            </div>
          `
        }
      },
      legend: {
        orient: 'vertical',
        right: '5%',
        top: 'center',
        textStyle: {
          color: isDark ? '#d1d5db' : '#374151'
        },
        formatter: (name: string) => {
          const item = data.find((d) => d.tagName === name)
          const maxLength = 10
          const displayName = name.length > maxLength ? name.slice(0, maxLength) + '...' : name
          return `${displayName} (${item?.count || 0})`
        }
      },
      series: [
        {
          name: t('statistics:CHART.TAG_DISTRIBUTION'),
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['35%', '50%'],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 8,
            borderColor: isDark ? '#1f2937' : '#fff',
            borderWidth: 2
          },
          label: {
            show: false
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 14,
              fontWeight: 'bold',
              color: isDark ? '#fff' : '#1f2937'
            },
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          },
          data: pieData.map((item) => ({
            ...item,
            selected: item.name === selectedTag
          }))
        }
      ]
    }
  }, [data, selectedTag, t, i18n.language])

  const onEvents = {
    click: (params: any) => {
      if (params.componentType === 'series') {
        onTagSelect(selectedTag === params.name ? null : params.name)
      }
    }
  }

  if (data.length === 0) {
    return (
      <div
        className={`flex h-[300px] items-center justify-center text-gray-500 ${className || ''}`}
      >
        {t('statistics:CHART.NO_DATA')}
      </div>
    )
  }

  return (
    <div className={className}>
      <ReactECharts
        option={option}
        style={{ height: '300px', width: '100%' }}
        onEvents={onEvents}
        opts={{ renderer: 'canvas' }}
      />
    </div>
  )
}
