## Context

当前 `quality` 在 PR 和 master push 上都启动类型/Lint/规格检查、全量覆盖率、完整开发与生产 E2E、生产依赖审计和 bundle 分析。最近 15 个当前配置运行中，工作流耗时 P50/P90 为 4.7/15 分钟，job 耗时合计 P50/P90 为 16.3/25.5 分钟；覆盖率与开发 E2E 合计 P50/P90 为 11.2/21 job 分钟。覆盖率规范及阈值由 `coverage-governance` 主规格管理；本变更只调整触发时机和风险分层。

## Goals / Non-Goals

**Goals:**

- 让普通 PR 保留规格、类型、Lint、变更相关测试和生产构建。
- 对认证/授权、数据库/迁移、feature 服务端写入、媒体存储和 E2E 生命周期变更加跑完整单元/集成测试与隔离数据库开发 E2E。
- 在独立夜间/手动 workflow 保留全量覆盖率、完整开发与生产 E2E、bundle 分析。
- 保持现有覆盖率阈值、数据库隔离、迁移审查、权限与数据保护行为。

**Non-Goals:**

- 删除或合并现有测试，按测试文件数量缩减用例。
- 改变应用权限、事务、版本保护、日志脱敏、数据库迁移或 E2E seed 策略。
- 改动 branch protection；`quality / verify` 继续作为 PR 稳定汇总检查。

## Decisions

1. **在现有质量 workflow 中分类变更。** `specs` job 用 base/head diff 调用一个仓库内分类脚本，并输出是否有 TS/TSX 测试目标及是否命中高风险路径。使用本地 Git diff，避免引入第三方路径分类 action。
2. **普通改动运行 Vitest 相关用例。** 使用 Vitest `--changed=<base SHA>`，不启用 coverage。测试配置的现有 include/exclude 保持不变；静态、migration-governance、invariant、process 与生产依赖审计仍在常规 workflow 阻塞执行。
3. **高风险改动升级检查。** 认证/授权、DB schema/migration、feature `server` 目录、媒体/存储、E2E 配置/生命周期等路径触发完整非覆盖率 Vitest 清单及完整开发 E2E。PWA、Playwright 配置、E2E 测试和 E2E 生命周期本身的改动还触发生产 E2E。各测试 job 各自创建并清理专属 `file:` 数据库。
4. **把完整保障放入独立 workflow。** `quality-full.yml` 由 UTC 每日计划任务和 `workflow_dispatch` 触发。覆盖率维持两个 shard 和原合并阈值；开发 E2E、生产 E2E、bundle 分析作为独立 job，各自安装依赖。生产 E2E 由现有 Playwright webServer 完成一次 build 和启动；分析 job 单独 build 后生成静态报告，避免在同一生产 E2E job 重复构建。
5. **稳定 PR 汇总状态。** `quality / verify` 使用 classifier 输出区分必须成功和允许跳过的条件 job；被要求的 lane 必须为 `success`，失败或取消都使汇总失败。
6. **保护风险分类器自身。** `unit_checks` 在每个 PR 上运行现有 workflow 契约测试，不依赖 classifier 输出；契约断言覆盖分类器自身、质量 workflow 和授权/限流边界路径。

备选方案：在 PR 中保留全部工作流，仅把 matrix shard 数量调小。该方案仍让普通 PR 支付开发 E2E 和 bundle 分析成本，且会削弱覆盖执行范围，因此不采用。

## Risks / Trade-offs

- [变更相关测试的静态依赖分析可能漏掉运行时加载关系] → 高风险路径不使用选择性测试，而运行完整单元/集成清单；迁移/DB/E2E 工具变化列入高风险路径；夜间完整覆盖率继续作为全量回归。
- [风险路径规则可能过宽或过窄] → 将路径列表集中在单一分类脚本，契约测试覆盖分类输出和各 job 条件；后续用 PR 数据校准，不删除安全测试。
- [夜间 workflow 失败可能延迟发现] → PR 仍保留全部基础阻塞检查和生产构建；手动 full gate 可在发布前主动运行。
- [并行 job 重复安装依赖及运行数据库准备] → 保留每个 DB 测试 lane 自有隔离库，避免跨 lane 共享状态导致误报或污染。

## Migration Plan

1. 增加风险分类脚本和夜间/手动完整 workflow。
2. 精简 PR workflow 并更新 `quality / verify` 条件汇总。
3. 更新工作流契约测试与本能力规格。
4. 若后续数据表明风险选择器漏检或常规反馈变慢，回退只需恢复原 PR job 依赖/条件；完整 workflow 可继续保留。

## Open Questions

- 风险路径分类粒度应随新 PR 的 job 耗时和失败数据复核；初始范围宁可覆盖完整 feature 服务端边界。
