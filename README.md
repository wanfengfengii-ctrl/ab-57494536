# 环形接驳板回流线配对（Ring Chord Matcher）

海底观测设备回收后，需要在环形接驳板上为每个裸露端点安排一条回流线。本应用为
**React + TypeScript 纯前端**工具：在浏览器中编辑或导入端点与候选连线，本地精确求解
最优配对并以环形布局展示，无需任何后端。

## 问题定义与求解规则

- 端点按**圆周顺序**排列，数量必须为**不小于 2 的偶数**且 id 唯一；
- 候选连线为允许连接的端点对，损耗为**非负整数**；候选为无向边，不得自连、不得重复；
- 每个端点必须**恰好连接一次**，选中的弦**不得在圆内相交**；
- 系统**完整比较全部可行配对**（界面会显示比较过的方案总数），依次按：
  1. **总损耗最低**；
  2. **配对另一端编号序列字典序最小**（按圆序编号 1..n 升序取各端点的配对对象编号）；
  
  取最优方案；
- 结果逐线标出损耗，并可点击任意弦查看与其交叉冲突的候选；同时列出候选集合中的
  全部冲突关系；
- 无可行配对时明确报告并**撤下全部旧连线**；任何模型修改都会**立即撤下**已生成的连线。

求解采用区间动态规划（O(n²) 状态），比较规则为 `(总损耗, 配对序列字典序)`；
测试中以暴力枚举全部完美配对做对照，保证 DP 结果与穷举完全一致。

## 模型格式

**端点**：每行一个 id（按圆周顺序），空行与 `#` 开头行忽略。

**候选**：每行 `端点A 端点B 损耗`，分隔符可为空白或逗号。

**导入文件**支持两种格式（导出为 JSON）：

```json
{
  "endpoints": ["A", "B", "C", "D"],
  "candidates": [{ "a": "A", "b": "B", "loss": 3 }, ["C", "D", 4]]
}
```

```text
[endpoints]
A
B
[candidates]
A B 3
```

错误定位反馈覆盖：端点数为奇数/不足、端点重复、候选格式错误、损耗非非负整数、
候选自连、无向候选重复（含反向）、引用不存在的端点。

## 本地开发

```bash
npm ci
npm run dev        # 开发服务器
npm run test       # 单元测试（vitest，含 DP 对暴力枚举的随机对照）
npm run build      # 类型检查 + 产物构建（dist/）
npm run smoke      # 对 dist/ 做 HTTP 冒烟检查
npm run verify     # 测试 + 构建 + 冒烟，一步到位
```

## Docker

```bash
# 构建并启动 Web 服务（默认宿主机端口 8080，可用 WEB_PORT 覆盖）
docker compose up -d web
WEB_PORT=9000 docker compose up -d web

# 健康检查
docker compose ps                 # 查看 healthy 状态
curl http://localhost:8080/healthz

# 一次性验证：构建 + 单元测试 + HTTP 冒烟，退出码即结果
docker compose run --rm verify
echo $?                           # 0 为通过
```

- `web` 服务：多阶段构建，nginx 静态托管 `dist/`，暴露容器 80 端口，
  宿主机端口由 `WEB_PORT` 环境变量配置（默认 8080），内置 `/healthz` 健康检查；
- `verify` 服务：一次性容器，依次执行 `vitest` 单元测试、`tsc + vite` 构建、
  对构建产物做 HTTP 冒烟（请求首页与 JS 资产），随后自行退出并以退出码报告结果。

## 目录结构

```
src/
  core/            # 纯逻辑：解析校验、DP 求解、交叉判定、导入导出（无 DOM 依赖）
  components/      # CircleView（环形布局）、EditorPanel、ResultPanel
tests/             # vitest 单元测试（含随机模型 DP vs 暴力枚举对照）
scripts/           # verify.sh（测试+构建+冒烟）、smoke.mjs（静态托管冒烟）
Dockerfile         # deps / verify / build / runtime 多阶段
docker-compose.yml # web（可配端口+健康检查）与 verify（一次性）服务
```
