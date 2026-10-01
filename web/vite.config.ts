import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// 开发模式:/api 直连 api-stock(服务端到服务端,绕开浏览器 CORS),
// token 从 .env.development.local 的 VITE_DEV_TOKEN 注入(loadEnv 显式读取);
// 生产走 CF Pages Functions(functions/api/[[path]].ts)。
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [vue(), tailwindcss()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'https://api-stock.600044.xyz', // 与外部部署完全一致(公网入口)
          changeOrigin: true,
          configure(p) {
            p.on('proxyReq', (req) => {
              // 用户自带 token(设置页粘贴)原样透传;仅游客请求注入 dev token
              if (!req.getHeader('authorization') && env.VITE_DEV_TOKEN)
                req.setHeader('Authorization', `Bearer ${env.VITE_DEV_TOKEN}`)
            })
          },
        },
      },
    },
  }
})
