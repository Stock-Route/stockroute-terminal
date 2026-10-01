<script setup lang="ts">
// 市场心跳回放:241 分钟点 涨跌家数+成交额 动画回放(全网独家的分钟级市场宽度)
import { onMounted, onBeforeUnmount, ref, computed } from 'vue'
import * as echarts from 'echarts'
import { api } from '../api'

const el = ref<HTMLDivElement>()
const loading = ref(true)
const err = ref('')
const cur = ref(0)                    // 当前播放指针
const playing = ref(true)
const speed = ref(24)                 // 点/秒(241点≈10秒回放)
const dates = ref<string[]>([])
const dateSel = ref('')

let chart: echarts.ECharts | null = null
let breadth: any[] = [], turnover: any[] = []
let timer: number | undefined

const curLabel = computed(() => {
  const b = breadth[cur.value]
  if (!b) return '--:--'
  const ms = Number(b.ts_ms)
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
})

async function loadDates() {
  // 近 30 个交易日:按数据集最新分片取 trade_date 列表(直接拉最新1日+往前翻页简化:拉300条覆盖多日)
  const r = await api('/api/query', { dataset: 'sentiment.breadth_minute', limit: 241 * 30 })
  const rows = r?.rows || []
  const s = new Set<string>()
  for (const x of rows) s.add(String(x.trade_date))
  dates.value = [...s].sort().reverse().slice(0, 30)
  if (!dateSel.value) dateSel.value = dates.value[0]
}

async function loadDay() {
  loading.value = true; err.value = ''
  try {
    const [b, t] = await Promise.all([
      api('/api/query', { dataset: 'sentiment.breadth_minute', limit: 241, start: dateSel.value, end: dateSel.value }),
      api('/api/query', { dataset: 'quote.turnover_minute', limit: 241, start: dateSel.value, end: dateSel.value }),
    ])
    breadth = (b?.rows || []).slice()
    turnover = (t?.rows || []).slice()
    render()
    play()
  } catch (e: any) { err.value = e.message || String(e) } finally { loading.value = false }
}

function option(): echarts.EChartsOption {
  const rise = breadth.map(x => Number(x.rise))
  const fall = breadth.map(x => -Number(x.fall))
  const lu = breadth.map(x => Number(x.limit_up))
  const ld = breadth.map(x => -Number(x.limit_down))
  const to = turnover.map(x => Number(x.turnover) / 1e8)
  const x = breadth.map((_, i) => i)
  const shown = (arr: number[]) => arr.map((v, i) => (i <= cur.value ? v : null))
  const toShown = to.map((v, i) => (i <= cur.value ? v : null))
  return {
    backgroundColor: 'transparent',
    animation: false,
    grid: [{ left: 60, right: 60, top: 40, bottom: 90 }],
    xAxis: { type: 'category', data: x, axisLabel: { color: '#71717a', interval: 30,
      formatter: (i: any) => { const b = breadth[i]; if (!b) return ''; const d = new Date(Number(b.ts_ms)); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}` } } },
    yAxis: [
      { type: 'value', axisLabel: { color: '#71717a' }, splitLine: { lineStyle: { color: '#18181b' } } },
      { type: 'value', name: '成交额(亿)', nameTextStyle: { color: '#71717a' }, axisLabel: { color: '#71717a' }, splitLine: { show: false } },
    ],
    series: [
      { name: '上涨家数', type: 'line', data: shown(rise), symbol: 'none', smooth: true,
        lineStyle: { color: '#ff4d5e', width: 2 }, areaStyle: { color: 'rgba(255,77,94,.18)' } },
      { name: '下跌家数', type: 'line', data: shown(fall), symbol: 'none', smooth: true,
        lineStyle: { color: '#2ee6a6', width: 2 }, areaStyle: { color: 'rgba(46,230,166,.15)' } },
      { name: '涨停', type: 'bar', data: shown(lu), itemStyle: { color: 'rgba(255,77,94,.8)' }, barWidth: 2 },
      { name: '跌停', type: 'bar', data: shown(ld), itemStyle: { color: 'rgba(46,230,166,.8)' }, barWidth: 2 },
      { name: '成交额', type: 'bar', yAxisIndex: 1, data: toShown, itemStyle: { color: 'rgba(245,197,66,.35)' }, barWidth: '55%' },
    ],
    tooltip: { trigger: 'axis', backgroundColor: '#18181b', borderColor: '#3f3f46', textStyle: { color: '#e4e4e7' } },
  }
}

function render() {
  if (!el.value) return
  chart = chart || echarts.init(el.value)
  chart.setOption(option())
}

function play() {
  playing.value = true
  clearInterval(timer)
  timer = window.setInterval(() => {
    if (!playing.value) return
    if (cur.value >= breadth.length - 1) { cur.value = 0 } else { cur.value++ }
    render()
  }, 1000 / speed.value)
}
function toggle() { playing.value = !playing.value }
function onSlider() { playing.value = false; render() }

onMounted(async () => {
  window.addEventListener('resize', () => chart?.resize())
  try { await loadDates(); await loadDay() } catch (e: any) { err.value = e.message; loading.value = false }
})
onBeforeUnmount(() => { clearInterval(timer); chart?.dispose() })
</script>

<template>
  <div class="mb-4 flex flex-wrap items-center gap-3">
    <select v-model="dateSel" @change="loadDay" class="bg-zinc-800 rounded-lg px-3 py-1.5 text-sm">
      <option v-for="d in dates" :key="d" :value="d">{{ d }}</option>
    </select>
    <button @click="toggle" class="px-4 py-1.5 rounded-lg bg-red-500/90 hover:bg-red-500 text-sm font-medium">
      {{ playing ? '⏸ 暂停' : '▶ 回放' }}
    </button>
    <span class="text-2xl font-bold tabular-nums w-16 text-center">{{ curLabel }}</span>
    <input type="range" :max="breadth.length - 1 || 240" v-model.number="cur" @input="onSlider" class="flex-1 accent-red-500" />
    <label class="text-xs text-zinc-400">速度
      <select v-model.number="speed" @change="play" class="bg-zinc-800 rounded px-2 py-1 ml-1">
        <option :value="48">4x</option><option :value="24">2x</option><option :value="12">1x</option>
      </select>
    </label>
  </div>

  <div v-if="loading" class="text-zinc-500 py-20 text-center">加载中…</div>
  <div v-else-if="err" class="card text-center py-16 text-zinc-300">{{ err }}</div>
  <div v-show="!loading && !err" ref="el" class="h-[480px]"></div>

  <p class="text-xs text-zinc-500 mt-3">
    上涨/下跌家数实时呼吸,柱状=分钟成交额。收盘后数据每分钟一点,回放全天情绪起伏。
    数据:StockRoute(免费档可用)
  </p>
</template>
