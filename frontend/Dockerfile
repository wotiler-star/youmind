# ---------- 构建阶段 ----------
FROM node:20-alpine AS build
# 默认使用官方 npm registry；如需加速可传入 --build-arg NPM_REGISTRY=<镜像地址>
ARG NPM_REGISTRY=https://registry.npmjs.org/
WORKDIR /app

COPY package*.json ./
RUN npm ci --registry ${NPM_REGISTRY}

COPY . .
RUN npm run build

# ---------- 运行阶段 ----------
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY default.conf.template /etc/nginx/conf.d/default.conf.template
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=3s --retries=5 \
    CMD wget -qO- http://127.0.0.1/healthz >/dev/null 2>&1 || exit 1

ENTRYPOINT ["/entrypoint.sh"]
