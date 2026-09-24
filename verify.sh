#!/bin/sh
# 一次性校验服务：代码测试 -> 生产构建 -> HTTP 冒烟。
# 任一步失败即以非零退出码退出；全部通过输出 VERIFY_OK 并退出 0。
set -eu

echo "==> [1/3] 代码测试（vitest）"
npm run test

echo "==> [2/3] 生产构建（类型检查 + vite build）"
npm run build

echo "==> [3/3] HTTP 冒烟（对 web 静态服务）"
# web 服务由 depends_on 保证已通过健康检查
wget -q -O - "http://web/healthz" | grep -q '^ok$'
wget -q -O - "http://web/" | grep -q "环形接驳板"

echo "VERIFY_OK: 构建、测试、HTTP 冒烟全部通过"
