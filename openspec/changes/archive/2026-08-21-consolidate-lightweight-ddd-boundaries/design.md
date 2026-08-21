## Context

业务模块原先同时分布在 feature 目录和 tRPC module 目录，schema、router 测试和
类型契约的归属不一致。当前正式 router 已经位于 `src/features`，因此剩余工作是
将 schema、测试和边界文档收敛到同一业务边界。

## Goals / Non-Goals

**Goals:**

- 让 `src/features/<feature>` 成为业务代码唯一来源。
- 保留选择性 DDD：Post、Comment、User 保留 domain；简单模块不新增领域对象。
- 让 tRPC 包只承载 transport 基础设施。
- 用自动化边界测试阻止旧目录和跨层依赖回归。

**Non-Goals:**

- 不删除仍有真实用例价值的 service。
- 不创建通用 CRUD repository、facade 或 application 层。
- 不修改业务 API、数据库 schema 或权限语义。

## Decisions

- 业务 schema 放在各 feature 的 `schemas/`，由 feature router 和 UI 直接使用。
- router 测试放在对应 feature 的 `tests/`；跨模块测试和测试工具仍放在 `tests/`。
- `src/packages/trpc/api/app-router.ts` 保留为唯一的 tRPC router composition point。
- 公开 DTO 类型直接依赖稳定 repository 返回契约，不依赖普通 CRUD service 的类型推导。
- 空的 `transport/` 目录删除；feature 根部 `*.router.ts` 直接承担传输适配。

## Risks / Trade-offs

- [迁移遗漏] 旧路径可能被新代码重新引用 → 边界测试检查旧模块目录和 feature schema 依赖。
- [测试发现变化] 测试移动可能影响单测扫描 → 迁移后运行全量 Vitest。
- [文档滞后] 历史文档可能保留旧路径 → 同步更新测试和架构文档，并保留 OpenSpec 变更记录。
