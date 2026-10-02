#!/bin/sh
# 运行时渲染 nginx 配置(token 经环境变量注入,不落镜像层)
envsubst '${STOCKROUTE_TOKEN}' < /etc/nginx/templates/nginx.conf.template > /etc/nginx/conf.d/default.conf
exec nginx -g "daemon off;"
