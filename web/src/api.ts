// 统一数据客户端:全部走同源 /api(vite dev 代理 / CF Functions 生产代理)。
// 用户 token(设置页粘贴)优先;游客回落服务端 DEMO_TOKEN(生产)。
const USER_KEY = 'STOCKROUTE_USER_TOKEN'

export function getUserToken(): string { return localStorage.getItem(USER_KEY) || '' }
export function setUserToken(t: string) { localStorage.setItem(USER_KEY, t.trim()) }
export function clearUserToken() { localStorage.removeItem(USER_KEY) }

export async function api<T = any>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') qs.set(k, String(v))
  const headers: Record<string, string> = {}
  const ut = getUserToken()
  if (ut) headers['Authorization'] = `Bearer ${ut}`
  // 2026-10-01 修:调用方传的 path 可能已带 /api 前缀,双写 /api/api/query = 404 且无审计
  // (公网实测实锤:首页恒空白的根因);归一化防呆
  const p = path.startsWith('/api') ? path : `/api${path}`
  // 网络级自动重试 1 次:公网链路偶发抖动(ETIMEDOUT),静默自愈不打扰用户
  let r: Response
  for (let i = 0; i < 2; i++) {
    try { r = await fetch(`${p}?${qs}`, { headers }); break }
    catch { if (i === 1) throw Object.assign(new Error('网络波动,请重试'), { code: 'RETRY' }) }
  }
  r = r!
  const body = await r.json().catch(() => ({}))
  if (r.status === 401) throw Object.assign(new Error('Token 无效,请在设置页检查'), { code: 'AUTH' })
  // 403 三分:配额耗尽(不可重试,次日恢复)/档位不足(可升级)/其他
  // 2026-10-02 修:此前所有 403 一律归"需升级+可重试",配额耗尽的用户反复点重试毫无意义
  if (r.status === 403 || body?.error === 'TIER_TOO_LOW' || r.status === 429 && body?.error === 'MONTH_QUOTA_EXCEEDED') {
    const msg = String(body?.message || '')
    if (/已达上限|已用完/.test(msg) || body?.error?.includes('QUOTA') || body?.error?.includes('POINTS') || body?.error?.includes('ROWS'))
      throw Object.assign(new Error(msg || '今日额度已用完'), { code: 'QUOTA' })
    if (body?.error === 'TIER_TOO_LOW' || r.status === 403)
      throw Object.assign(new Error('该数据需要更高档位'), { code: 'TIER' })
  }
  if (r.status === 429) throw Object.assign(new Error('请求过快,稍后再试'), { code: 'RATE' })
  if (!r.ok || body?.ok === false)
    throw Object.assign(new Error(body?.message || `HTTP ${r.status}`), { code: body?.error || 'ERR' })
  return body
}
