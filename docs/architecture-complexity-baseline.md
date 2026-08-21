# 架构复杂度基线

本基线对应 `reduce-architecture-complexity` 变更，记录迁移前的可量化指标。指标用于比较趋势，不作为脱离职责的机械拆分依据。

## 规模指标

| 指标                      |                                    基线 |
| ------------------------- | --------------------------------------: |
| `src` 文件数              |                                     679 |
| `src` TypeScript/TSX 行数 |                               约 46,080 |
| 业务 feature 数           | 10 个业务模块，另有 1 个 contracts 目录 |
| 路由页面                  |                                      25 |
| layout                    |                                       5 |
| route handler             |                                       5 |
| 组件入口                  |                                      73 |
| 测试文件                  |                                     208 |
| 数据库迁移                |                                      14 |
| 数据表定义                |                                      17 |
| 生产文件超过 600 行       |                                       0 |

## 目标预算

- 新增生产文件 MUST 不超过 600 行；超过 300 行时必须在设计或代码审查中说明职责边界。
- 新增业务入口 MUST 经过 Application Use Case 或明确登记为只读展示组合。
- feature 之间 MUST 不得导入对方的 `admin`、`application`、`transport` 或 `infrastructure` 内部实现。
- domain 和 infrastructure MUST 不得反向依赖 App Router 或 tRPC transport。
- presentation 和共享 UI MUST 不得直接依赖数据库 schema。
- 每个 capability MUST 在 registry 中登记并覆盖其生产消费者。

## 自动检查

基础检查位于 `tests/architecture-complexity.test.ts`，并与现有 `feature-boundaries.test.ts`、`package-boundaries.test.ts` 和 capability 测试共同组成架构门禁。后续迁移完成后，应重新生成本文件的规模指标并记录差异。
