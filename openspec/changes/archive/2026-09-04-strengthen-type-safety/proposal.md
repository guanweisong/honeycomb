## 为什么

工程虽然启用了 TypeScript 严格模式，但部分 Application Repository 契约仍通过显式 `any` 放弃了跨层类型约束，生产代码和测试中也存在可以通过准确建模、控制流窄化或类型化测试替身消除的断言。现在需要系统治理这些类型逃逸，使“端到端类型安全”覆盖传输层之外的 Application、Infrastructure 和测试边界，并防止同类问题回归。

## 变更内容

- 消除生产代码中的显式 `any`，优先修复 Category、Link 等开放式 Application Repository DTO。
- 审计生产代码中的普通类型断言、双重断言和非空断言，以准确源类型、类型守卫、判别联合、空值分支或稳定映射替代能够明确建模的用法。
- 清理测试中可由类型化 fixture、结构化 fake、`satisfies` 或显式存在性检查替代的 `as never`、双重断言和非空断言。
- 保留 `as const`、校验后的品牌类型构造以及第三方库类型边界等合理断言；非显然的保留项必须局部化并说明原因。
- 新增类型安全治理测试，阻止生产 Application Repository 契约重新引入显式 `any` 或对应 ESLint 抑制。
- 保持 tRPC 路由、Zod 输入协议、数据库 schema、迁移及运行时行为不变。

## 能力

### 新增能力

- `type-safety-governance`：定义生产跨层契约和测试边界的类型安全要求、合理断言例外及自动化回归门禁。

### 修改能力

无。

## 影响

- 主要影响 `src/features/*/application`、对应 `infrastructure` 适配器、存在可清理断言的 App Router 与 UI 代码，以及相关测试 fixture。
- 新增或调整 Vitest 架构治理测试，但不新增运行时依赖。
- 不改变外部 API、持久化结构或部署配置，不属于破坏性变更。
- 本变更不同时启用 `noUncheckedIndexedAccess` 或 `exactOptionalPropertyTypes`；这两项会改变全工程类型语义，应作为独立迁移评估。
