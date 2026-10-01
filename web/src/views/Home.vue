<script setup lang="ts">
// 今日赚钱效应:温度 + 涨停统计 + 龙头榜 + 人气榜 + 异动流(结论先行,3 秒看懂)
import { onMounted, ref, computed } from 'vue'
import { api } from '../api'

const loading = ref(true)
const errs = ref<Record<string, string>>({})   // 每卡错误:null=正常/LOCKED=需档位/其他=可重试
const breadth = ref<any>(null)     // 最新一分钟涨跌家数
const turnover = ref<any>(null)    // 成交额
const zt = ref<any[]>([])          // 涨停池
const ladder = ref<any>(null)      // 连板梯队(boards_json)
const hot = ref<any[]>([])         // 人气榜
const anomaly = ref<any[]>([])     // 异动流

const temp = computed(() => {
  const b = breadth.value; if (!b) return null
  const total = Number(b.rise) + Number(b.fall)
  return Math.round((Number(b.rise) / (total || 1)) * 100)
})
const tempLabel = computed(() => {
  const t = temp.value ?? 50
  if (t >= 80) return '普涨 · 赚钱效应强'
  if (t >= 60) return '偏暖 · 可参与'
  if (t >= 40) return '分化 · 精选个股'
  if (t >= 20) return '偏冷 · 控制仓位'
  return '冰点 · 空仓观望'
})
const tempColor = computed(() => {
  const t = temp.value ?? 50
  return t >= 60 ? '#ff4d5e' : t >= 40 ? '#f5c542' : '#2ee6a6'
})
const ztCount = computed(() => breadth.value ? Number(breadth.value.limit_up) : zt.value.length)
const turnoverYi = computed(() => turnover.value ? (Number(turnover.value.turnover) / 1e8).toFixed(0) : '-')

// 连板梯队 boards_json → 最高板
const topLadder = computed(() => {
  try {
    const j = JSON.parse(ladder.value?.boards_json || '{}')
    const tiers: Record<string, string> = { nine_board: '9板', eight_board: '8板', seven_board: '7板', six_board: '6板', five_board: '5板', four_board: '4板', three_board: '3板', two_board: '2板' }
    for (const [k, label] of Object.entries(tiers)) {
      const arr = (j as any)[k]
      if (arr?.length) return { label, stocks: arr.slice(0, 6) }
    }
  } catch {}
  return null
})

async function load() {
  loading.value = true; err.value = ''
  try {
    const q = (ds: string, extra = '') => api('/api/query', { dataset: ds, limit: 300, ...Object.fromEntries(new URLSearchParams(extra)) })
    // 外部用户体验优化:温度/成交额只取最新 1 条;日快照(涨停/梯队)按日期缓存 5 分钟
    // (收盘后数据不变,重复进页不重复付公网延迟;外部部署同样受益)
    const dayCache = (key: string, fn: () => Promise<any>, ttlMs = 5 * 60_000): Promise<any> => {
      try {
        const hit = JSON.parse(sessionStorage.getItem(key) || 'null')
        if (hit && Date.now() - hit.t < ttlMs) return Promise.resolve(hit.v)
      } catch {}
      return fn().then(v => { try { sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), v })) } catch {} ; return v })
    }
    const wrap = async (key: string, fn: () => Promise<any>) => {
      try { errs.value[key] = ''; return await fn() }
      catch (e: any) {
        errs.value[key] = e.code === 'TIER' ? 'LOCKED' : (e.code === 'AUTH' ? 'AUTH' : 'RETRY')
        return null
      }
    }
    const [b, tv, z, l, h, a] = await Promise.allSettled([
      wrap('temp', () => dayCache('sr.breadth1', () => q('sentiment.breadth_minute', 'limit=1'))),
      wrap('temp', () => dayCache('sr.turnover1', () => q('quote.turnover_minute', 'limit=1'))),
      wrap('zt', () => dayCache('sr.zt300', () => q('board.zt_pools'))),
      wrap('ladder', () => dayCache('sr.ladder', () => q('board.limit_ladder', 'limit=1'))),
      wrap('hot', () => q('sentiment.hot_ths', 'limit=10')),
      wrap('flow', () => q('board.anomaly_reason', 'limit=30')),
    ])
    const pick = (x: PromiseSettledResult<any>, n = 1) => x.status === 'fulfilled' ? (x.value?.rows || []).slice(0, n) : []
    breadth.value = pick(b)[0]
    turnover.value = pick(tv)[0]
    zt.value = pick(z, 300)
    ladder.value = pick(l)[0]
    hot.value = pick(h, 10)
    anomaly.value = pick(a, 30)
  } catch (e: any) {
    err.value = e.message || String(e)
  } finally { loading.value = false }
}
onMounted(load)
</script>

<template>
  <div v-if="loading" class="text-zinc-500 py-20 text-center">加载中…</div>
  <div v-else-if="err" class="card text-center py-16">
    <p class="text-zinc-300 mb-2">{{ err }}</p>
    <p class="text-xs text-zinc-500">游客模式下部分数据不可用;粘贴免费 token 可解锁(右上角设置)</p>
  </div>
  <template v-else>
    <!-- 温度主卡 -->
    <div class="card mb-4 flex items-center gap-8">
      <div class="text-center">
        <div class="text-6xl font-black" :style="{ color: tempColor }">{{ temp ?? '--' }}°</div>
        <div class="text-xs text-zinc-500 mt-1">赚钱效应温度</div>
      </div>
      <div class="grid grid-cols-2 gap-x-10 gap-y-2 text-sm flex-1">
        <div>红盘 <b class="up">{{ breadth?.rise ?? '-' }}</b> 家 / 绿盘 <b class="down">{{ breadth?.fall ?? '-' }}</b> 家</div>
        <div>涨停 <b class="up">{{ ztCount }}</b> · 跌停 <b class="down">{{ breadth?.limit_down ?? '-' }}</b></div>
        <div>两市成交 <b>{{ turnoverYi }}</b> 亿</div>
        <div class="text-zinc-400">{{ tempLabel }}</div>
      </div>
    </div>

    <div class="grid md:grid-cols-2 gap-4">
      <!-- 龙头榜 -->
      <div class="card">
        <h2 class="text-sm font-semibold text-zinc-300 mb-3">🏆 连板龙头</h2>
        <div v-if="errs['ladder']==='LOCKED'" class="text-sm text-zinc-400 py-6 text-center">
          🔒 连板梯队需基础档 <a href="https://m-stock.600044.xyz" target="_blank" class="text-red-400 underline">升级 →</a>
        </div>
        <div v-else-if="errs['ladder']" class="text-sm text-zinc-400 py-6 text-center">
          加载失败 <button @click="load()" class="text-sky-400 underline">重试</button>
        </div>
        <template v-else-if="topLadder">
          <div class="text-2xl font-bold mb-2">{{ topLadder.label }}</div>
          <div class="flex flex-wrap gap-2">
            <span v-for="s in topLadder.stocks" :key="s.thscode" class="px-2.5 py-1 rounded-lg bg-red-500/10 text-red-300 text-sm">
              {{ s.name || s.thscode }}
            </span>
          </div>
        </template>
        <p v-else class="text-zinc-500 text-sm">今日无 2 板以上梯队</p>
        <div class="mt-3 text-xs text-zinc-500">今日涨停 {{ ztCount }} 只 · 涨停池前5:
          <span v-for="s in zt.slice(0,5)" :key="s.code" class="text-red-300/80 mr-1">{{ s.name }}</span>
        </div>
      </div>

      <!-- 人气榜 -->
      <div class="card">
        <h2 class="text-sm font-semibold text-zinc-300 mb-3">🔥 人气榜 Top10
          <button v-if="errs['hot']" @click="load()" class="float-right text-xs text-sky-400 underline">重试</button></h2>
        <p v-if="errs['hot']" class="text-sm text-zinc-400 py-6 text-center">{{ errs['hot']==='AUTH' ? '请设置 token' : '加载失败,点重试' }}</p>
        <ol class="space-y-1.5 text-sm">
          <li v-for="s in hot" :key="s.ticker" class="flex items-center gap-2">
            <span class="w-5 text-zinc-500 text-xs">{{ s.rank }}</span>
            <span class="font-medium">{{ s.name }}</span>
            <span class="text-zinc-500 text-xs">{{ s.ticker }}</span>
            <span v-if="s.rank_trend==='up'" class="text-red-400 text-xs">↑{{ s.rank_change }}</span>
            <span v-else-if="s.rank_trend==='down'" class="text-emerald-400 text-xs">↓{{ s.rank_change }}</span>
            <span class="ml-auto text-zinc-600 text-xs">热度 {{ Number(s.heat/10000).toFixed(0) }}万</span>
          </li>
        </ol>
      </div>
    </div>

    <!-- 异动流 -->
    <div class="card mt-4">
      <h2 class="text-sm font-semibold text-zinc-300 mb-3">⚡ 异动与归因
        <button v-if="errs['flow']" @click="load()" class="float-right text-xs text-sky-400 underline">重试</button></h2>
      <p v-if="errs['flow']" class="text-sm text-zinc-400 py-6 text-center">{{ errs['flow']==='AUTH' ? '请设置 token' : '加载失败,点重试' }}</p>
      <div class="space-y-2.5 max-h-96 overflow-y-auto pr-1">
        <div v-for="(a, i) in anomaly" :key="i" class="border-l-2 pl-3 py-1"
             :class="a.tag_name?.includes('涨停') ? 'border-red-500/60' : a.tag_name?.includes('跌') ? 'border-emerald-500/60' : 'border-zinc-600'">
          <div class="flex items-baseline gap-2">
            <b class="text-sm">{{ a.stock_name }}</b>
            <span class="text-xs px-1.5 py-0.5 rounded"
                  :class="a.tag_name?.includes('涨停') ? 'bg-red-500/15 text-red-300' : a.tag_name?.includes('跌') ? 'bg-emerald-500/15 text-emerald-300' : 'bg-zinc-700/50 text-zinc-300'">
              {{ a.tag_name }}
            </span>
          </div>
          <p class="text-xs text-zinc-400 mt-1 leading-relaxed line-clamp-2">{{ a.analysis_content }}</p>
        </div>
      </div>
    </div>
  </template>
</template>
