## Why

当前工程已经具备清晰的分层和较完整的质量门禁，但业务入口、数据模型、权限判断和共享模块仍存在多种实现路径。随着功能继续增长，开发者需要同时理解路由、feature、tRPC、DDD、基础设施和权限矩阵，导致修改范围难以预测、边界回归风险升高。

本变更通过统一业务模块契约、收敛业务入口、隔离模型和权限事实来源，降低新增功能与跨模块修改的认知复杂度，同时把可维护性要求固化为可自动验证的工程规则。

## What Changes

- 统一 feature 的职责和依赖方向，按需使用 domain、application、infrastructure、transport、presentation 边界，不强制创建空目录。
- 以 Application Use Case 作为业务操作入口，收敛 tRPC、Server Action 和路由层中的业务编排；简单查询保留直接 Query/Repository 路径。
- 分离持久化模型、领域模型和 View Model，禁止数据库模型和传输模型泄漏到领域层及 UI 层。
- 仅在存在稳定、可复用业务不变量时引入领域模型；其他 CRUD 模块采用轻量 Query/Use Case、Repository 和 Adapter 模板。
- 将权限判断收敛到统一的 Capability 授权服务，消除页面、菜单、procedure 和 action 的重复解释。
- 限制 shared、packages 和跨 feature 公共模块的职责，防止形成新的共享垃圾桶。
- 增加依赖、层级、模型泄漏、权限入口覆盖和复杂度回归的自动化质量检查。
- 清理无价值的纯转发层、重复数据访问路径及未使用或重复的技术依赖。

## Capabilities

### New Capabilities

- `feature-module-contract`: 定义统一 feature 模块结构、职责和依赖方向。
- `application-use-case-boundary`: 定义业务用例作为唯一业务入口的行为契约。
- `model-boundary-governance`: 定义持久化模型、领域模型和 View Model 的隔离规则。
- `capability-authorization-unification`: 定义统一权限事实来源和多入口授权行为。
- `architecture-complexity-governance`: 定义架构边界、复杂度指标和自动化质量门禁。

### Modified Capabilities

- 无

## Impact

- 影响 `src/features`、`src/app`、`src/packages/trpc`、`src/packages/identity`、`src/packages/infrastructure` 和 `src/packages/ui` 的模块边界及调用方式。
- 影响 tRPC procedure、Server Action、服务端查询、权限注册表、数据库适配器和 feature 间契约，但目标是不改变对外业务语义。
- 需要新增架构测试、复杂度报告和迁移检查，并同步更新架构文档及开发约定。
- 可能删除或合并部分重复 wrapper、共享工具和未使用依赖。
