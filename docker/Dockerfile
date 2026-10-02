# ── 构建段:Vue3 前端 ──
FROM node:20-alpine AS build
RUN corepack enable && npm config set registry https://registry.npmmirror.com
WORKDIR /app
COPY web/package.json web/pnpm-lock.yaml* ./
RUN pnpm install --no-frozen-lockfile
COPY web/ ./
RUN pnpm build

# ── 运行段:nginx(静态 + API 代理)──
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx.conf.template /etc/nginx/templates/nginx.conf.template
COPY docker/start.sh /docker-entrypoint.d/40-envsubst.sh
RUN chmod +x /docker-entrypoint.d/40-envsubst.sh
EXPOSE 80
