# ---------- 构建阶段 ----------
FROM node:22-alpine AS builder
WORKDIR /app

# 先装依赖，利用层缓存
COPY package.json package-lock.json ./
RUN npm ci

# 拷贝源码并构建静态资源到 /app/dist
COPY . .
RUN npm run build

# ---------- 静态 Web 服务阶段 ----------
FROM nginx:1.27-alpine AS web

# 自定义站点配置：SPA 回退 + /healthz 健康检查端点
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

# 容器内健康检查（Compose 的 healthcheck 亦显式声明，可按宿主环境调整）
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=5 \
  CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
