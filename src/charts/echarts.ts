import * as echarts from 'echarts/core'
import { RadarChart, HeatmapChart, LineChart } from 'echarts/charts'
import {
  TooltipComponent,
  GridComponent,
  VisualMapComponent,
  RadarComponent,
  MarkPointComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
  CanvasRenderer,
  RadarChart,
  HeatmapChart,
  LineChart,
  TooltipComponent,
  GridComponent,
  VisualMapComponent,
  RadarComponent,
  MarkPointComponent,
])

export default echarts
export type { ECharts } from 'echarts/core'
