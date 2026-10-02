<script setup lang="ts">
// M7 个股一票看懂:异动归因 + K线 + 估值条 + 人气 —— 一个代码,一屏答案
import { onMounted, ref, computed, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import * as echarts from 'echarts'
import { api } from '../api'

const route = useRoute()
const code = computed(() => String(route.params.code || ''))
const loading = ref(true)
const errs = ref<Record<string, string>>({})
const info = ref<any>(null)
const krows = ref<any[]>([])
const anomalies = ref<any[]>([])
const hotRank = ref<any>(null)
const basic = ref<any>(null)
const fundflow = ref<any>(null)

const el = ref<HTMLDivElement>()
let chart: echarts.ECharts | null = null

async function run(key: string, fn: () => Promise<void>) {
  try { errs.value[key] = ''; await fn() }
  catch (e: any) {
    errs.value[key] = e.code === 'TIER' ? 'LOCKED' : (e.code === 'QUOTA' ? 'QUOTA' : (e.code === 'AUTH' ? 'AUTH' : 'RETRY'))
  }
}

async function load() {
  loading.value = true
  errs.value = {}
  const c = code.value
  const bare = c.split('.').pop() || c
  await Promise.allSettled([
    run('info', async () => {
      const d = await api(`/api/meta/stocks`, { keyword: bare })
      info.value = (d?.rows || [])[0] || null
    }),
    run('kline', async () => {
      const d = await api(`/api/kline`, { code: c, limit: 250 })
      krows.value = d?.rows || []
    }),
    run('anomaly', async () => {
      const d = await api('/api/query', { dataset: 'board.anomaly_reason', code: bare, limit: 5 })
      anomalies.value = (d?.rows || []).filter((x: any) => String(x.thscode || '').includes(bare))
    }),
    run('hot', async () => {
      const d = await api('/api/query', { dataset: 'sentiment.hot_ths', limit: 30 })
      hotRank.value = (d?.rows || []).find((x: any) => String(x.ticker) === bare) || null
    }),
    run('basic', async () => {
      const d = await api(`/api/daily_basic`, { code: bare })
      basic.value = ((d?.rows || d?.data) || [])[0] || null
    }),
    run('flow', async () => {
      const d = await api('/api/query', { dataset: 'moneyflow.ths_individual', code: c, limit: 1 })
      fundflow.value = (d?.rows || [])[0] || null
    }),
  ])
  loading.value = false
  await nextTick()
  renderK()          // 容器已挂载(v-if 释放)后渲染;提前渲染=零尺寸空图
}

function renderK() {
  if (!el.value || !krows.value.length) return
  chart = chart || echarts.init(el.value)
  const k = krows.value
  const dates = k.map(x => String(x.date))
  const candles = k.map(x => [+x.open, +x.close, +x.low, +x.high])
  const vol = k.map(x => +x.volume)
  const ma = (n: number) => k.map((_, i) => i < n - 1 ? null :
    +(k.slice(i - n + 1, i + 1).reduce((s, x) => s + +x.close, 0) / n).toFixed(2))
  chart.setOption({
    backgroundColor: 'transparent',
    animation: false,
    tooltip: { trigger: 'axis', backgroundColor: '#18181b', borderColor: '#3f3f46', textStyle: { color: '#e4e4e7' } },
    axisPointer: { link: [{ xAxisIndex: 'all' }] },
    grid: [{ left: 60, right: 20, top: 20, height: '58%' }, { left: 60, right: 20, top: '74%', height: '18%' }],
    xAxis: [
      { type: 'category', data: dates, axisLabel: { color: '#71717a' } },
      { type: 'category', gridIndex: 1, data: dates, axisLabel: { show: false } },
    ],
    yAxis: [
      { scale: true, axisLabel: { color: '#71717a' }, splitLine: { lineStyle: { color: '#18181b' } } },
      { gridIndex: 1, axisLabel: { show: false }, splitLine: { show: false } },
    ],
    series: [
      { type: 'candlestick', data: candles, itemStyle: { color: '#ff4d5e', color0: '#2ee6a6', borderColor: '#ff4d5e', borderColor0: '#2ee6a6' } },
      { type: 'line', name: 'MA5', data: ma(5), symbol: 'none', lineStyle: { color: '#f5c542', width: 1 } },
      { type: 'line', name: 'MA20', data: ma(20), symbol: 'none', lineStyle: { color: '#818cf8', width: 1 } },
      { type: 'bar', xAxisIndex: 1, yAxisIndex: 1, data: vol, itemStyle: { color: '#3f3f46' } },
    ],
  })
}

const pe = computed(() => basic.value ? (basic.value.peTTM ?? basic.value.pe ?? '-') : '-')
const pbv = computed(() => basic.value ? (basic.value.pb ?? '-') : '-')
const mkt = computed(() => {
  const v = basic.value?.total_mv
  // total_mv 单位=万元(Tushare daily_basic 口径;600570 实测 3,673,677 万=367 亿勾稽 ✓)
  return v ? (Number(v) / 1e4).toFixed(0) + ' 亿' : '-'
})
const netText = computed(() => {
  const v = fundflow.value
  if (!v) return null
  const net = Number(v.net_inflow ?? v['净额'] ?? 0)
  return (net >= 0 ? '+' : '') + (net / 1e8).toFixed(2) + ' 亿'
})

function retry() { load() }
onMounted(load)
</script>

<template>
  <div v-if="loading" class="text-zinc-500 py-20 text-center">加载中…</div>
  <template v-else>
    <!-- 头卡:身份 + 估值条 -->
    <div class="card mb-4 flex flex-wrap items-center gap-x-8 gap-y-2">
      <div>
        <span class="text-2xl font-bold">{{ info?.name || code }}</span>
        <span class="ml-2 text-zinc-500">{{ code }}</span>
        <span v-if="info?.is_st" class="ml-2 text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-300">ST</span>
        <div class="text-xs text-zinc-500 mt-1">{{ info?.industry || '-' }} · 上市 {{ info?.list_date || '-' }}</div>
      </div>
      <div class="grid grid-cols-3 gap-x-8 text-sm" v-if="errs['basic'] !== 'LOCKED' && errs['basic'] !== 'QUOTA'">
        <div>PE(TTM) <b>{{ pe }}</b></div>
        <div>PB <b>{{ pbv }}</b></div>
        <div>总市值 <b>{{ mkt }}</b></div>
      </div>
      <div v-if="hotRank" class="ml-auto text-sm">
        🔥 人气榜 <b class="text-red-300">#{{ hotRank.rank }}</b>
        <span class="text-zinc-500 text-xs">热度 {{ Number(hotRank.heat/10000).toFixed(0) }}万</span>
      </div>
    </div>

    <!-- K线 -->
    <div class="card mb-4">
      <h2 class="text-sm font-semibold text-zinc-300 mb-2">日 K(近 250 交易日)
        <span class="float-right text-xs text-zinc-500">免费档近 3 年 · 高档全史</span></h2>
      <div v-if="errs['kline']" class="text-sm text-zinc-400 py-10 text-center">
        {{ errs['kline']==='AUTH' ? 'Token 无效,请检查设置' : errs['kline']==='QUOTA' ? '🪫 今日额度已用完,次日 0 点恢复' : '加载失败' }}
        <button v-if="errs['kline']==='RETRY'" @click="retry()" type="button" class="ml-2 text-sky-400 underline">重试</button>
      </div>
      <div v-show="!errs['kline']" ref="el" style="height:420px"></div>
    </div>

    <div class="grid md:grid-cols-2 gap-4">
      <!-- 异动归因 -->
      <div class="card">
        <h2 class="text-sm font-semibold text-zinc-300 mb-3">⚡ 为什么涨跌(AI 归因)</h2>
        <p v-if="errs['anomaly']" class="text-sm text-zinc-400 py-4">{{ errs['anomaly']==='QUOTA' ? '🪫 今日额度已用完' : '暂无归因数据' }}</p>
        <p v-else-if="!anomalies.length" class="text-sm text-zinc-500 py-4">近期无异动记录</p>
        <div v-else class="space-y-2.5">
          <div v-for="(a, i) in anomalies" :key="i" class="border-l-2 pl-3 py-1"
               :class="a.tag_name?.includes('涨停') ? 'border-red-500/60' : a.tag_name?.includes('跌') ? 'border-emerald-500/60' : 'border-zinc-600'">
            <span class="text-xs px-1.5 py-0.5 rounded"
                  :class="a.tag_name?.includes('涨停') ? 'bg-red-500/15 text-red-300' : a.tag_name?.includes('跌') ? 'bg-emerald-500/15 text-emerald-300' : 'bg-zinc-700/50 text-zinc-300'">
              {{ a.tag_name }}</span>
            <p class="text-xs text-zinc-400 mt-1 leading-relaxed">{{ a.analysis_content }}</p>
          </div>
        </div>
      </div>

      <div class="space-y-4">
        <!-- 资金流 -->
        <div class="card">
          <h2 class="text-sm font-semibold text-zinc-300 mb-3">💰 当日主力资金</h2>
          <p v-if="errs['flow']==='LOCKED'" class="text-sm text-zinc-400 py-4 text-center">
            🔒 资金流明细需基础档 <a href="https://m-stock.600044.xyz" target="_blank" class="text-red-400 underline">升级 →</a></p>
          <p v-else-if="errs['flow']==='QUOTA'" class="text-sm text-amber-300/80 py-4 text-center">🪫 今日额度已用完</p>
          <div v-else-if="netText" class="text-center py-2">
            <div class="text-3xl font-bold" :class="netText.startsWith('-') ? 'down' : 'up'">{{ netText }}</div>
            <div class="text-xs text-zinc-500 mt-1">主力净流入(THS 口径)</div>
          </div>
          <p v-else class="text-sm text-zinc-500 py-4 text-center">暂无数据</p>
        </div>
        <!-- 提示 -->
        <div class="card text-xs text-zinc-500 leading-relaxed">
          数据仅供研究参考,不构成投资建议;行情非实时(≤15s)。
          想实时盯这只票?<a href="https://m-stock.600044.xyz" class="text-sky-400 underline">平台添加自选 →</a>
        </div>
      </div>
    </div>
  </template>
</template>
