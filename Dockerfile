# syntax=docker/dockerfile:1

# ---------- 依赖层：安装全部依赖（含 devDependencies，供测试与构建使用） ----------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---------- 一次性验证：代码测试 + 构建 + HTTP 冒烟，退出码即结果 ----------
FROM deps AS verify
COPY . .
RUN chmod +x scripts/verify.sh
CMD ["sh", "scripts/verify.sh"]

# ---------- 构建层：产出静态文件 ----------
FROM deps AS build
COPY . .
RUN npm run build

# ---------- 运行时：nginx 静态托管，含健康检查 ----------
FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/healthz || exit 1
