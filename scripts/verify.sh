#!/bin/sh
# 一次性验证：代码测试 -> 构建 -> HTTP 冒烟。
# 任一步骤失败即以非零码退出；全部通过退出码为 0。
set -eu

echo "==> [1/3] 运行单元测试 (vitest)"
npm run test

echo "==> [2/3] 类型检查并构建静态产物 (tsc + vite)"
npm run build

echo "==> [3/3] HTTP 冒烟检查 (node scripts/smoke.mjs)"
node scripts/smoke.mjs dist

echo "==> 验证通过"
