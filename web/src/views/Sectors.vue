<script setup lang="ts">
// M1 板块热度三视图:涨跌热力 / 主力资金 / (数据集 ths_industry,基础档)
import { onMounted, ref, computed } from 'vue'
import * as echarts from 'echarts'
import { api } from '../api'

const el = ref<HTMLDivElement>()
const loading = ref(true)
const err = ref<'' | 'LOCKED' | 'QUOTA' | 'RETRY' | 'AUTH'>('')
const mode = ref<'pct' | 'fund'>('pct')
const rows = ref<any[]>([])
const updatedAt = ref('')
let chart: echarts.ECharts | null = null

const stats = computed(() => {
  const up = items.value.filter(x => x.pct > 0).length
  const down = items.value.filter(x => x.pct < 0).length
  const top = [...items.value].sort((a, b) => b.pct - a.pct)[0]
  const topFund = [...items.value].sort((a, b) => b.fund - a.fund)[0]
  return { up, down, total: items.value.length, top, topFund }
})

const items = computed(() => rows.value.map(x => ({
  name: x.industry || x['行业'] || '?',
  pct: Number(x.industry_pct_chg ?? x['行业-涨跌幅'] ?? 0),
  fund: Number(x.net_inflow ?? x['净额'] ?? 0),   // 原生口径=亿(THS 页面口径,registry units 同)
  count: Number(x.company_count ?? x['公司家数'] ?? 1),
  lead: x.leading_stock || x['领涨股'] || '',
})))

function colorOf(v: number, max: number): string {
  if (!v) return '#3f3f46'
  const t = Math.min(Math.abs(v) / (max || 1), 1)
  const a = 0.25 + t * 0.7
  return v > 0 ? `rgba(255,77,94,${a})` : `rgba(46,230,166,${a})`
}

function render() {
  if (!el.value) return
  chart = chart || echarts.init(el.value)
  const data = items.value.map(x => ({
    name: x.name,
    value: [x.count, mode.value === 'pct' ? x.pct : x.fund],
    pct: x.pct, fund: x.fund, lead: x.lead,
    itemStyle: { color: colorOf(mode.value === 'pct' ? x.pct : x.fund,
      Math.max(...items.value.map(y => Math.abs(mode.value === 'pct' ? y.pct : y.fund)))) },
  }))
  chart.setOption({
    backgroundColor: 'transparent',
    tooltip: { backgroundColor: '#18181b', borderColor: '#3f3f46', textStyle: { color: '#e4e4e7' },
      formatter: (p: any) => {
        const d = p.data
        return `<b>${d.name}</b><br/>涨跌 ${Number(d.pct).toFixed(2)}%<br/>主力净额 ${Number(d.fund).toFixed(2)} 亿<br/>领涨股 ${d.lead || '-'}`
      } },
    series: [{
      type: 'treemap', data, roam: false, nodeClick: false,
      breadcrumb: { show: false },
      label: { show: true,
               formatter: (p: any) => mode.value === 'pct'
                 ? `${p.name}\n${Number(p.data.pct) > 0 ? '+' : ''}${Number(p.data.pct).toFixed(2)}%`
                 : `${p.name}\n主力 ${Number(p.data.fund) > 0 ? '+' : ''}${Number(p.data.fund).toFixed(1)}亿`,
               color: '#fff', fontSize: 12, lineHeight: 18 },
      itemStyle: { borderColor: '#0B0E14', borderWidth: 2, gapWidth: 2 },
      upperLabel: { show: false },
    }],
  })
}

async function load() {
  loading.value = true
  try {
    const d = await api('/api/query', { dataset: 'moneyflow.ths_industry', limit: 200 })
    rows.value = d?.rows || []
    if (rows.value.length) updatedAt.value = String(rows.value[0].trade_date || '')
  } catch (e: any) {
    err.value = e.code === 'TIER' ? 'LOCKED' : e.code === 'QUOTA' ? 'QUOTA' : e.code === 'AUTH' ? 'AUTH' : 'RETRY'
  } finally { loading.value = false; setTimeout(() => render(), 50) }
}
function onMode(m: 'pct' | 'fund') { mode.value = m; render() }

onMounted(async () => {
  window.addEventListener('resize', () => chart?.resize())
  await load()
})
</script>

<template>
  <div class="mb-3 flex flex-wrap items-center gap-3">
    <h1 class="text-lg font-bold">板块热度</h1>
    <div class="flex rounded-lg overflow-hidden border border-zinc-700 text-sm">
      <button type="button" @click="onMode('pct')" :class="mode==='pct' ? 'bg-red-500/80 text-white' : 'text-zinc-400 hover:text-white'" class="px-3 py-1">涨跌热力</button>
      <button type="button" @click="onMode('fund')" :class="mode==='fund' ? 'bg-red-500/80 text-white' : 'text-zinc-400 hover:text-white'" class="px-3 py-1">主力资金</button>
    </div>
    <span v-if="updatedAt" class="text-xs text-zinc-500">数据日期 {{ updatedAt.slice(0,4) }}-{{ updatedAt.slice(4,6) }}-{{ updatedAt.slice(6,8) }}(收盘)</span>
  </div>

  <!-- 怎么读这张图:一眼自解释 -->
  <div class="card mb-3 px-4 py-3 text-sm text-zinc-300 leading-relaxed">
    <template v-if="mode==='pct'">
      <b class="text-zinc-100">怎么读:</b>每个格子 = 一个行业板块,<b>格子越大 = 里面上市公司越多</b>;
      <span class="text-red-400">红色 = 今天上涨</span>、<span class="text-emerald-400">绿色 = 今天下跌</span>,颜色越深涨/跌越猛。
      想知道「钱今天流进了哪些行业」→ 切到<b>主力资金</b>。
    </template>
    <template v-else>
      <b class="text-zinc-100">怎么读:</b>每个格子 = 一个行业板块,格子大小含义同左;
      颜色改为表示<b>主力资金净流入</b>——<span class="text-red-400">红色 = 主力净买入</span>、<span class="text-emerald-400">绿色 = 主力净卖出</span>,越深金额越大。红格集中的区域就是今天资金扎堆的方向。
    </template>
  </div>

  <!-- 图例 + 当日概览 -->
  <div class="mb-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-zinc-400">
    <div class="flex items-center gap-2">
      <span class="inline-block w-8 h-3 rounded-sm" style="background:rgba(255,77,94,.85)"></span>涨 / 净流入
      <span class="inline-block w-8 h-3 rounded-sm mx-1" style="background:#3f3f46"></span>
      <span class="inline-block w-8 h-3 rounded-sm" style="background:rgba(46,230,166,.85)"></span>跌 / 净流出
      <span class="text-zinc-600">← 颜色越深越强</span>
    </div>
    <template v-if="!loading && !err && stats.total">
      <span class="text-zinc-500">|</span>
      <span><b class="text-red-400">{{ stats.up }}</b> 个行业上涨 · <b class="text-emerald-400">{{ stats.down }}</b> 个下跌</span>
      <span v-if="stats.top">领涨 <b class="text-zinc-200">{{ stats.top.name }}</b> <b class="text-red-400">+{{ stats.top.pct.toFixed(2) }}%</b></span>
      <span v-if="stats.topFund && stats.topFund.fund > 0">主力最买 <b class="text-zinc-200">{{ stats.topFund.name }}</b> <b class="text-red-400">+{{ stats.topFund.fund.toFixed(1) }}亿</b></span>
    </template>
  </div>

  <div v-if="loading" class="text-zinc-500 py-20 text-center">加载中…</div>
  <div v-else-if="err==='LOCKED'" class="card text-center py-12">
    <p class="text-2xl mb-2">🔒</p>
    <p class="text-zinc-200 mb-3">板块资金热力需基础档及以上</p>
    <a href="https://m-stock.600044.xyz" class="text-sm text-red-400 underline">去升级 →</a>
  </div>
  <div v-else-if="err==='QUOTA'" class="card text-center py-12 text-amber-300/80">🪫 今日额度已用完,次日 0 点恢复</div>
  <div v-else-if="err==='AUTH'" class="card text-center py-12 text-zinc-300">Token 无效,请在设置页检查</div>
  <div v-else-if="err" class="card text-center py-12">
    加载失败 <button @click="load()" type="button" class="text-sky-400 underline">重试</button>
  </div>
  <div v-show="!loading && !err" ref="el" style="height:560px"></div>

  <p class="text-xs text-zinc-600 mt-3">
    悬停任意格子可看涨跌幅 / 主力净额 / 领涨股明细。数据为收盘口径,盘中请看首页异动流。
  </p>
</template>
