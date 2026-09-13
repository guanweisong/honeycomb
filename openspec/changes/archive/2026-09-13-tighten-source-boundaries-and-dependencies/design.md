## Context

静态扫描确认 9 份权限 UI 矩阵及其类型只由测试辅助模块导入，却位于 `src`；tRPC i18n 包装也只有测试消费者。另有 16 个 schema 文件只重新导出 Application 写入契约，内部路由、组件和测试仍经由这些路径引用。`bcryptjs` 没有生产代码消费者，认证配置未接入它，当前唯一代码引用是一个未被用例触发的测试 mock。

本次保持已有业务行为和契约不变，收窄生产源码边界及依赖清单，并用测试防止这些残留回归。

## Goals / Non-Goals

**Goals:**

- 把权限 UI 矩阵及专用静态类型移入 `tests`，继续用于现有真实路由授权覆盖。
- 删除 test-only i18n schema 包装和 16 个没有独立职责的 schema 转发文件；消费者直接引用权威 Application schema。
- 删除无运行时用途的 bcryptjs mock 和生产依赖，修正 README 过时的依赖说明。
- 通过架构门禁固定测试目录、Application schema 权威来源和生产依赖范围。

**Non-Goals:**

- 不修改登录密码哈希实现、权限策略、tRPC 输入语义、数据库 schema、路由或用户可见行为。
- 不合并博客菜单、后台导航和菜单 Repository 中同名但字段/用途不同的类型。
- 不删除仍定义查询或输入规则的 `schemas` 文件，也不清理有独立消费者的模块。

## Decisions

1. **将权限矩阵按 Feature 搬到测试夹具目录。** 每个 Feature 的矩阵继续独立维护在 `tests/fixtures/admin-action-guard-matrix/`，类型放在 `tests/helpers/`；现有测试聚合入口保持稳定。相较合成单个大文件，这保留了按 Feature 查找和评审的便利。
2. **测试直接组合权威 i18n schema。** 删除 `src/packages/trpc/api/schemas/i18n.schema.ts`。行为测试分别从 Application 和 Domain 引入现存 schema，并在测试内组合 optional 输入，不在生产目录保留仅用于测试的适配层。
3. **消费者直接导入 Application 写入 schema。** 将 16 个纯重新导出文件的消费者迁移到对应 `application/write-schema`，对 Menu 与 Setting 保留显式导入别名以维持本地调用语义；删除这些转发文件。真正定义查询或输入规则的 schema 文件保持不变。
4. **删除无效 bcrypt 边界 mock 与依赖。** 权限矩阵中的实际首个边界只有数据库与对象存储；移除无用的 hash 计数分支。认证继续使用当前 Better Auth 配置，不新增或替换哈希实现。
5. **增加回归检查。** 架构复杂度测试列明不可回归的 test-only 源码路径、纯转发 schema 路径和生产 bcryptjs 依赖；TypeScript 编译及全量测试验证所有消费者已迁移。

## Risks / Trade-offs

- [直接导入 Application 契约会暴露更多层级路径] → 仅限同一 Feature 内部消费者；跨 Feature 仍遵循现有公开契约规则。
- [移动权限矩阵会改变测试夹具导入路径] → 保留现有聚合 helper 的导出和矩阵顺序，并运行权限边界与全量单测。
- [移除 bcryptjs 可能影响测试环境中的隐式消费者] → 全仓搜索后同时删除唯一 mock，并用冻结锁文件和全量单测验证。
- [静态路径门禁可能误删框架入口] → 本次只列出明确的 test-only 与纯转发路径，不扫描或删除 Next.js、next-intl、Serwist 约定入口。

## Migration Plan

1. 先新增架构回归断言，确认其能识别现有 test-only 文件、schema 转发文件和 bcryptjs 依赖。
2. 移动权限矩阵夹具、删除 i18n 转发层并迁移测试引用。
3. 迁移生产及测试消费者到 Application 写入 schema，删除纯转发文件并更新唯一事实源测试。
4. 删除 bcryptjs mock/依赖，更新 README 和架构测试。
5. 运行 OpenSpec 校验、类型检查、Lint、全量单测、生产构建和差异检查；若任何业务契约变化则回退对应迁移并修正范围。

## Open Questions

无。
