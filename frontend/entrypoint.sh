#!/bin/sh
# 启动前根据 BACKEND_URL 渲染 nginx 反代配置
# 本地 docker compose 默认 http://backend:8000；云平台部署时通过环境变量覆盖
# 使用 busybox 自带的 sed 渲染，避免依赖额外安装的 gettext(envsubst)
set -e

BACKEND_URL="${BACKEND_URL:-http://backend:8000}"

sed "s|__BACKEND_URL__|${BACKEND_URL}|g" \
    /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'
