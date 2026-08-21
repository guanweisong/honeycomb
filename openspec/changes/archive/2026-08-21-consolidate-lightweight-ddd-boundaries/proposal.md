## Why

当前业务代码已经迁移到 `src/features`，但迁移过程中的设计和任务被记录在
`docs/superpowers/`，与项目既有的 OpenSpec 工作流不一致。同时，旧的 tRPC 业务
模块目录、重复的业务 schema 和分散的测试目录增加了定位成本。

## What Changes

- 将本次架构优化的设计、需求和任务统一记录到 OpenSpec change。
- 以 `src/features` 作为业务 schema、router、service、repository 和测试的唯一归属。
- 让 `src/packages/trpc` 只保留 tRPC 基础设施。
- 删除旧的 `src/packages/trpc/api/modules` 业务目录和空的 feature `transport` 目录。
- 增加边界测试，防止旧业务入口重新出现。
- 删除不再需要的 `docs/superpowers/` 设计与计划文档。

## Capabilities

### New Capabilities

- `feature-business-boundaries`: 定义业务 feature 的唯一归属、目录边界和测试约束。

### Modified Capabilities

无。

## Impact

- 影响 `src/features`、`src/packages/trpc/api`、架构边界测试和测试文档。
- 不改变 tRPC procedure 名称、输入校验、输出契约或运行时 API。
- 不引入新依赖，不改变数据库结构。
