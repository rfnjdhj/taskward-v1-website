import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { useTranslation } from 'react-i18next'
import { PriorityStats, PRIORITY_LABELS } from '@/utils'

interface BarChartProps {
  data: PriorityStats[]
  selectedPriority: 'high' | 'medium' | 'low' | null
  onPrioritySelect: (priority: 'high' | 'medium' | 'low' | null) => void
  className?: string
}

const PRIORITY_COLORS = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#10b981'
}

export default function BarChart({
  data,
  selectedPriority,
  onPrioritySelect,
  className
}: BarChartProps) {
  const { t, i18n } = useTranslation(['statistics'])

  const option = useMemo(() => {
    const isDark = document.documentElement.classList.contains('dark')

    const priorityLabels = data.map((item) =>
      t(`statistics:PRIORITY.${item.priority.toUpperCase()}`)
    )
    const counts = data.map((item) => item.count)
    const colors = data.map((item) => PRIORITY_COLORS[item.priority])

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        formatter: (params: any) => {
          const param = params[0]
          return `
            <div style="padding: 8px;">
              <div style="font-weight: bold; margin-bottom: 4px;">${param.name}</div>
              <div>${t('statistics:CHART.TASK_COUNT')}: ${param.value}</div>
              <div style="margin-top: 4px; font-size: 12px; color: #666;">${t('statistics:CHART.CLICK_TO_FILTER')}</div>
            </div>
          `
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: priorityLabels,
        axisLabel: {
          color: isDark ? '#9ca3af' : '#6b7280'
        },
        axisLine: {
          lineStyle: {
            color: isDark ? '#4b5563' : '#e5e7eb'
          }
        }
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: {
          color: isDark ? '#9ca3af' : '#6b7280'
        },
        splitLine: {
          lineStyle: {
            color: isDark ? '#374151' : '#f3f4f6'
          }
        }
      },
      series: [
        {
          name: t('statistics:CHART.TASK_COUNT'),
          type: 'bar',
          barWidth: '50%',
          data: data.map((item, index) => ({
            value: item.count,
            itemStyle: {
              color: PRIORITY_COLORS[item.priority],
              borderRadius: [8, 8, 0, 0],
              opacity: selectedPriority === null || selectedPriority === item.priority ? 1 : 0.3
            }
          })),
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.3)'
            }
          }
        }
      ]
    }
  }, [data, selectedPriority, t, i18n.language])

  const onEvents = {
    click: (params: any) => {
      if (params.componentType === 'series') {
        const clickedPriority = data[params.dataIndex]?.priority
        if (clickedPriority) {
          onPrioritySelect(selectedPriority === clickedPriority ? null : clickedPriority)
        }
      }
    }
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
