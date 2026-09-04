## Context

Post 与 Page 的 tRPC 输入已经通过 Zod 校验，但 Application Repository 仍把多语言字段声明为 `unknown`，把状态和内容类型声明为裸 `string`。Infrastructure 再通过整体断言适配 Drizzle，形成编译器无法验证的跨层空洞。

## Goals / Non-Goals

**Goals:**

- Application Command DTO 准确表达所有允许字段和可空性。
- tRPC schema 输出在编译期满足 DTO。
- Drizzle mapper 逐字段构造并由 `satisfies` 验证。
- 防止以后重新引入开放式命令字段和整体 ORM 断言。

**Non-Goals:**

- 不改变外部 JSON 输入输出。
- 不改变数据库 schema 或迁移。
- 不把 Drizzle 类型暴露到 Application。

## Decisions

### Application 拥有独立的业务 DTO

Post 定义 `PostCreateCommand`、`PostUpdateCommand`，Page 定义对应命令。多语言字段使用明确的 `I18nInput`，状态、类型、评论状态和模板使用既有领域枚举。更新 DTO 使用明确的可选字段，而不是以 `unknown` 作为跨层缓冲。

### Zod schema 与 DTO 通过编译期契约测试对齐

Schema 保持传输层事实源，同时使用类型级赋值或 `satisfies` 证明其输出可传给 Application；不让 Application 直接导入 Zod。

### Infrastructure 显式映射持久化字段

Mapper 不再 `{ ...input } as InferInsertModel`，而是列出允许字段、规范化多语言值并清洗富文本，最终使用 `satisfies` 检查 Drizzle 输入。这样新增数据库列不会被意外写入，DTO 变化也会触发编译错误。

## Risks / Trade-offs

- [现有 Zod 推导类型与领域枚举存在细微差异] → 先写编译期测试，修正 schema 输出而不改变运行时协议。
- [显式 mapper 较长] → 接受少量重复字段以换取真实边界，不建立通用 cast helper。
- [测试 fixture 依赖宽类型] → 使用准确 factory 或 `satisfies` 更新，不使用 `as never`。

## Migration Plan

1. 添加会因当前 `unknown`/裸字符串契约失败的治理测试。
2. 收紧 Post DTO 并更新 mapper、Use Case 和 fixture。
3. 收紧 Page DTO并更新 mapper、Use Case 和 fixture。
4. 验证 tRPC 协议快照和数据库写入值不变。
5. 运行类型、架构、完整测试、覆盖率和构建门禁。

## Open Questions

无。
