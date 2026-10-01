// CF Pages Functions 数据代理(生产环境唯一数据通道)
// - 游客:服务端注入 DEMO_TOKEN(env secret)
// - 已设置个人 token 的用户:Authorization 原样透传(消耗用户配额,解锁档位)
// - 缓存:读请求按 URL 缓存 60s(Cache API,同 URL 全站共享,防白嫖上游)
// 错误码语义与 api-server 信封一致,原样透传不做二次包装。
export const onRequest: PagesFunction<{ DEMO_TOKEN: string }> = async ({ request, env, waitUntil }) => {
  const url = new URL(request.url)
  const upstream = `https://api-stock.600044.xyz${url.pathname}${url.search}`

  if (request.method !== 'GET') return json({ ok: false, error: 'METHOD_NOT_ALLOWED' }, 405)

  const headers: Record<string, string> = { Accept: 'application/json' }
  const userAuth = request.headers.get('Authorization')
  if (userAuth) headers['Authorization'] = userAuth
  else if (env.DEMO_TOKEN) headers['Authorization'] = `Bearer ${env.DEMO_TOKEN}`
  else return json({ ok: false, error: 'DEMO_UNCONFIGURED', message: '代理未配置 token' }, 503)

  // Cache API:仅缓存 200 读响应
  const cache = caches.default
  const cacheKey = new Request(upstream + '|' + (userAuth ? 'u' : 'd'), request)
  let hit = await cache.match(cacheKey)
  if (hit) return hit

  let r: Response
  try {
    r = await fetch(upstream, { headers, cf: { cacheTtl: 0 } })
  } catch {
    return json({ ok: false, error: 'SERVICE_UNAVAILABLE', message: '上游暂不可达,稍后重试' }, 503)
  }
  const body = await r.text()
  const out = new Response(body, { status: r.status, headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Data-By': 'stockroute',
    'Access-Control-Allow-Origin': '*',
  }})
  if (r.status === 200) waitUntil(cache.put(cacheKey, out.clone()))
  return out
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}
