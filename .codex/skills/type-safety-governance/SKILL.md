---
name: type-safety-governance
description: 当在 Honeycomb 工程中编写、修改或审查 TypeScript 的跨层契约、Repository DTO、可空数据、测试夹具、类型窄化或第三方适配，或处理 any、类型断言、非空断言和抑制注释时使用。
---

# 类型安全治理

## 核心原则

生成或修改类型敏感代码时，先按本 Skill 设计真实契约，审计清理只是补救。目标是消除不真实的类型承诺，而不是追求字符层面的“零断言”。先修正信息来源，再窄化；只有公开类型确实无法表达时，才保留最小且有说明的适配断言。

## 处理顺序

对每个 `any`、`as`、`!` 或规则抑制依次判断：

1. 修正源类型或跨层 DTO；
2. 使用控制流、类型谓词或判别联合窄化；
3. 缺失值合法时使用 fallback 或提前返回；
4. 缺失值违反不变量时增加已测试的错误分支；
5. 第三方公开类型无法表达时，在适配边界保留最窄断言并写明原因。

新增运行时分支时，**REQUIRED SUB-SKILL:** Use superpowers:test-driven-development。

## 适用边界

涉及 Repository 分层、端口归属或 ORM 隔离时，**REQUIRED SUB-SKILL:** Use lightweight-ddd。本 Skill 不重复定义分层架构，只补充类型逃逸的处理方式。

| 场景 | 要求 |
| --- | --- |
| 跨层契约 | 修正源 DTO；不得用 `any`、`as` 或开放式记录掩盖层间类型泄漏 |
| Use Case 测试依赖 | 从既有端口选择最小 `Pick`；不要用断言伪装完整依赖 |
| App Router 参数 | 保持外部参数为 `string`，经运行时校验或规范化后再作为领域联合类型使用 |
| 可空展示数据 | 日期、媒体尺寸、关联记录等必须显式处理缺失值，不使用非空断言掩盖 |
| 测试 fake | 使用 `Pick`、准确 fixture、typed factory 或 `satisfies`；禁止用 `as never` 伪装完整业务契约 |
| 第三方测试替身 | 通过单一辅助函数建立 `unknown` 边界，调用点不重复强转 |

## 可以保留的类型表达

- `as const` 字面量与只读窄化；
- 经过运行时校验后，在品牌类型构造器内部建立品牌的断言；
- Drizzle、Better Auth、Zod resolver、React 或其他第三方未公开内部类型所需的局部 `unknown` 适配；
- 框架泛型 API 返回 `unknown` 且调用点掌握列定义等可靠上下文时的最小断言。

第三方边界必须同时满足：位于具名 adapter 或测试 helper、返回固定目标类型、输入输出结构最小、调用路径受限。不得接受由调用方任意指定的目标泛型，也不得承载业务 DTO 转换。

若测试 helper 必须返回 `Database` 等完整框架类型，只能用于该框架的低层 adapter、context 或集成测试；业务 Use Case fixture 必须继续使用最小 `Pick`，不能调用该 helper。

这些边界不得改写为通用 `cast<T>()`、`asMock<T>()` 或扩散到业务调用点。非显然双重断言必须在相邻注释中说明具体类型缺口和可移除条件；治理门禁应对允许位置使用窄路径清单。

## 治理门禁

静态门禁只禁止高风险模式：生产代码的显式 `any`、`as never`、`no-explicit-any`，以及无边界说明的双重断言。不得用全局正则禁止所有 `as`、`!` 或单词 `any`，以免误报 `as const`、`expect.any`、导入别名、CSS 和英文文本。

验证应与改动风险成比例，并遵循受影响工程 Skill 的质量门禁：

- 始终运行 `bun run check-types`、`bun run lint`、相关测试和 `git diff --check`；
- 跨层契约、共享测试基础设施或大范围治理变更运行完整单元测试与覆盖率；
- 仅在变更影响生产构建、框架边界，或对应质量门禁要求时运行 `bun run build`。

若工作属于 OpenSpec 变更，**REQUIRED SUB-SKILL:** Use openspec-apply-change，并用中文同步对应工件。本 Skill 不重复定义 OpenSpec 流程。不得为了通过门禁修改公开输入协议、数据库 schema、迁移或依赖，除非用户明确扩大范围。

## 常见错误

- 把所有断言一律删除：会丢失合法 readonly、品牌和第三方边界语义。
- 用 `unknown` 原样替换 `any`：只是把契约问题推给消费者。
- 为每个用例新建单方法端口：优先从已有 Application Repository 选择最小 `Pick`。
- 用更隐蔽的辅助函数包装强转：类型逃逸仍然存在，只是更难审计。
- 先改实现再补空值测试：无法证明测试能捕获原问题。
