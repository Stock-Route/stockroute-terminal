<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getUserToken, setUserToken } from './api'
const router = useRouter()
const showSettings = ref(false)
const tokenInput = ref(getUserToken())
const saved = ref('')
function save() { setUserToken(tokenInput.value); location.reload() }

// 全局搜股:输代码或名称 → 下拉 → 回车/点选进个股页
const kw = ref('')
const results = ref<any[]>([])
const searching = ref(false)
let timer: number | undefined
watch(kw, (v) => {
  clearTimeout(timer)
  const s = v.trim()
  if (!s) { results.value = []; return }
  timer = window.setTimeout(async () => {
    searching.value = true
    try {
      const r = await fetch(`/api/meta/stocks?keyword=${encodeURIComponent(s)}`).then(x => x.json())
      results.value = (r?.rows || []).slice(0, 8)
    } catch { results.value = [] } finally { searching.value = false }
  }, 250)
})
function go(code: string) { kw.value = ''; results.value = []; router.push(`/stock/${code}`) }
function onSearchKey(e: KeyboardEvent) {
  if (e.key === 'Enter' && results.value.length) go(results.value[0].code)
}
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <nav class="sticky top-0 z-50 backdrop-blur bg-[#0B0E14]/85 border-b border-zinc-800">
      <div class="max-w-6xl mx-auto px-4 h-14 flex items-center gap-6">
        <a href="/" class="font-bold text-lg tracking-wide">StockRoute <span class="text-red-400">Terminal</span></a>
        <a href="/" class="text-sm text-zinc-400 hover:text-white">今日赚钱效应</a>
        <a href="/heartbeat" class="text-sm text-zinc-400 hover:text-white">市场心跳</a>
        <div class="relative flex-1 max-w-xs">
          <input v-model="kw" @keydown="onSearchKey" placeholder="搜代码 / 名称(回车)"
                 class="w-full bg-zinc-800/80 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-red-400" />
          <div v-if="results.length" class="absolute z-50 mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden shadow-xl">
            <div v-for="s in results" :key="s.code" @click="go(s.code)"
                 class="px-3 py-2 hover:bg-zinc-800 cursor-pointer text-sm flex justify-between">
              <span>{{ s.name }} <span class="text-zinc-500 text-xs">{{ s.code }}</span></span>
              <span class="text-zinc-500 text-xs">{{ s.industry }}</span>
            </div>
          </div>
        </div>
        <div class="ml-auto flex items-center gap-3">
          <span v-if="getUserToken()" class="text-xs px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-300">个人 token</span>
          <button @click="showSettings = !showSettings" class="text-sm px-3 py-1 rounded-lg border border-zinc-700 hover:border-zinc-500">设置</button>
        </div>
      </div>
      <div v-if="showSettings" class="max-w-6xl mx-auto px-4 pb-4 -mt-1">
        <div class="card flex flex-wrap items-center gap-3">
          <input v-model="tokenInput" type="password" placeholder="粘贴你的 StockRoute token(免费注册即得)"
                 class="flex-1 min-w-60 bg-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-red-400" />
          <a href="https://m-stock.600044.xyz" target="_blank" class="text-xs text-sky-400 hover:underline">去平台生成 →</a>
          <button @click="save" class="text-sm px-4 py-1.5 rounded-lg bg-red-500/90 hover:bg-red-500 font-medium">保存</button>
          <button v-if="getUserToken()" @click="tokenInput=''; save()" class="text-xs text-zinc-400 hover:text-white">清除</button>
          <span class="text-xs text-emerald-400">{{ saved }}</span>
        </div>
      </div>
    </nav>

    <main class="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
      <router-view />
    </main>

    <footer class="border-t border-zinc-800 py-4 text-center text-xs text-zinc-500 space-x-2">
      <span>数据仅供研究参考,不构成投资建议</span>·<span>行情非实时(延迟 ≤15s)</span>·
      <a class="hover:text-zinc-300" href="https://github.com/Stock-Route/stockroute-terminal">GitHub</a>·
      <a class="hover:text-zinc-300" href="https://github.com/Stock-Route/stockroute-sdk">SDK</a>
      <span>data · stockroute.pro</span>
    </footer>
  </div>
</template>
