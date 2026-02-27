import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import { DailyCompletedStats } from '@/utils'

interface LineChartProps {
  data: DailyCompletedStats[]
  selectedDate: string | null
  onDateSelect: (date: string | null) => void
  highlightTag?: string | null
  className?: string
}

export default function LineChart({
  data,
  selectedDate,
  onDateSelect,
  highlightTag,
  className
}: LineChartProps) {
  const { t, i18n } = useTranslation(['statistics'])

  const option = useMemo(() => {
    const dates = data.map((d) => d.date)
    const counts = data.map((d) => d.count)

    const isDark = document.documentElement.classList.contains('dark')

    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const param = params[0]
          const dateData = data.find((d) => d.date === param.axisValue)
          return `
            <div style="padding: 8px;">
              <div style="font-weight: bold; margin-bottom: 4px;">${param.axisValue}</div>
              <div>${t('statistics:CHART.COMPLETED_TASKS')}: ${param.value}</div>
              ${dateData?.tasks.length ? `<div style="margin-top: 4px; font-size: 12px; color: #666;">${t('statistics:CHART.CLICK_TO_VIEW')}</div>` : ''}
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
        boundaryGap: false,
        data: dates,
        axisLabel: {
          formatter: (value: string) => dayjs(value).format('MM/DD'),
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
          name: t('statistics:CHART.COMPLETED_TASKS'),
          type: 'line',
          smooth: true,
          data: counts,
          lineStyle: {
            width: 3,
            color: highlightTag ? '#f59e0b' : '#10b981'
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                {
                  offset: 0,
                  color: highlightTag ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)'
                },
                {
                  offset: 1,
                  color: highlightTag ? 'rgba(245, 158, 11, 0.05)' : 'rgba(16, 185, 129, 0.05)'
                }
              ]
            }
          },
          itemStyle: {
            color: highlightTag ? '#f59e0b' : '#10b981'
          },
          emphasis: {
            itemStyle: {
              borderWidth: 3,
              borderColor: highlightTag ? '#f59e0b' : '#10b981'
            }
          },
          markPoint:
            selectedDate && dates.includes(selectedDate)
              ? {
                  data: [
                    {
                      coord: [selectedDate, counts[dates.indexOf(selectedDate)]],
                      itemStyle: { color: '#ef4444' }
                    }
                  ],
                  symbol: 'circle',
                  symbolSize: 12
                }
              : undefined
        }
      ]
    }
  }, [data, selectedDate, highlightTag, t, i18n.language])

  const onEvents = {
    click: (params: any) => {
      if (params.componentType === 'series') {
        const clickedDate = data[params.dataIndex]?.date
        if (clickedDate) {
          onDateSelect(selectedDate === clickedDate ? null : clickedDate)
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
