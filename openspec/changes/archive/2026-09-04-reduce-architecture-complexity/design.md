## Context

工程当前采用 Next.js App Router、feature 垂直模块、轻量 DDD、tRPC 和基础设施分层。现有边界测试能够阻止部分反向依赖，但业务入口、模型类型和权限判断仍分散在多个层次。此次设计面向长期维护，不以最小改动为目标，允许通过迁移和删除重复层换取更低的长期认知成本。

## Goals / Non-Goals

**Goals:**

- 建立所有 feature 都能遵循的职责和依赖契约，目录按需创建。
- 让业务操作由 Application Use Case 统一承载，同时保留简单查询的直接 Query/Repository 路径。
- 阻止数据库模型和传输模型泄漏到领域及展示层。
- 让权限判断只有一个事实来源。
- 用架构测试、复杂度预算和依赖审计持续防止回退。

**Non-Goals:**

- 不改变产品功能、公开 API 的业务语义或权限结果。
- 不把所有模块都改造成完整 DDD 聚合。
- 不引入新的状态管理框架或微服务。
- 不为了降低单文件行数而制造更多无职责的包装层。

## Decisions

1. **统一 feature 职责而非强制目录。** `domain`、`application`、`infrastructure`、`transport`、`presentation` 是可按需使用的概念边界；简单查询不创建 Use Case/Domain，复杂业务才引入 Domain。相比固定五层模板，这能降低空层和样板代码。

2. **Application Use Case 是唯一业务操作入口。** 改变持久化状态、触发外部副作用或需要多步骤协调的行为必须经过 Use Case；简单查询可由 Server Query/Repository 直接提供。tRPC、Server Action 和路由只做边界校验、上下文适配和结果映射。

3. **三类模型显式分离。** Drizzle 类型只停留在 infrastructure，领域类型只停留在 domain/application，稳定读取模型或 View Model 由 Query/presentation 组装。相比继续复用 tRPC output，这能避免数据库字段或 API 变更直接扩散到 UI。

4. **按业务复杂度分级。** 只有存在稳定、可复用且需要独立测试的业务不变量时才使用聚合、值对象或领域事件；其他模块使用轻量 Query/Use Case 模板。相比按模块名单固定 DDD，这能保留必要业务规则，同时避免简单 CRUD 产生仪式性结构。

5. **统一 Capability 授权。** capability registry 作为权限定义来源，授权服务负责把 capability、主体、资源和入口上下文转换为结果。菜单、页面和客户端只消费结果，不复制授权算法。相比维护多份角色判断，这能减少权限漂移。

6. **以自动化边界测试作为强制机制。** 增加依赖方向、模型泄漏、入口覆盖、复杂度预算和依赖使用检查；架构文档仅作为解释，测试作为执行约束。

## Risks / Trade-offs

- [迁移期双轨实现] → 按 feature 逐个迁移，并用兼容入口将旧调用转发到新 use case；每个模块完成后删除旧实现。
- [模型转换代码增加] → 只在边界集中 mapper，并禁止业务层重复转换；以类型检查和契约测试保证转换稳定。
- [统一模板掩盖真实差异] → 允许按规模省略空目录，且只对核心域要求聚合；架构测试检查职责而非固定文件数量。
- [权限集中服务成为瓶颈] → 保持窄接口和纯策略函数，授权结果可在边界缓存，但不把权限逻辑重新分散到调用方。
- [复杂度指标被形式化应付] → 指标必须关联依赖图、变更影响面、超长文件和入口数量，并在 PR 中输出差异。

## Migration Plan

1. 建立目标目录、依赖规则、模型分类和授权服务的基线测试。
2. 先迁移存在真实稳定不变量的核心业务，锁定领域行为和事件契约。
3. 迁移其余 CRUD feature，统一 use case、repository 和 transport 适配。
4. 迁移 app 页面及 UI 的 View Model，清理 tRPC output 和数据库类型泄漏。
5. 合并权限入口，删除重复授权逻辑和旧兼容层。
6. 清理重复依赖、shared 垃圾桶和纯转发层，更新文档及复杂度报告。
7. 完成全量类型检查、Lint、单测、架构测试、构建和 E2E 后删除迁移兼容代码。

回滚策略：每个 feature 迁移保持独立提交；若行为回归，恢复该 feature 的兼容入口和旧 adapter，不回滚已经验证通过的基础边界测试。

## Open Questions

- 是否将现有 `src/packages/trpc/api/outputs` 逐步替换为 feature-owned View Model，还是保留为跨 feature 查询契约。
- 是否将 `identity` 和通用 `infrastructure` 重命名为 `platform`，以减少技术包与业务 feature 的概念差异。
