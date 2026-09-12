# Feature Business Boundaries

## Purpose

定义业务 feature 的唯一实现归属、tRPC transport 边界、跨模块依赖方向和测试组织方式，避免业务规则回流共享技术包或通过深层导入形成不可维护耦合。

## Requirements

### Requirement: Feature owns business implementation

每个业务 feature MUST 在 `src/features/<feature>` 中拥有自己的 schema、router、用例、
repository、infrastructure 和测试。业务代码 MUST NOT 从
`src/packages/trpc/api/modules` 导入业务 schema 或 router。

#### Scenario: Feature schema is the source of truth

- **WHEN** feature 生产代码导入业务输入 schema
- **THEN** import 路径 MUST 指向对应 feature 的 `schemas/` 目录

#### Scenario: Legacy business module is absent

- **WHEN** package boundary tests 扫描 tRPC 基础设施目录
- **THEN** `src/packages/trpc/api/modules` MUST 不存在

### Requirement: Transport infrastructure is separate from business features

`src/packages/trpc` MUST 只包含 tRPC 核心、上下文、客户端绑定和共享 transport 工具。
业务 router MUST 由 `src/packages/trpc/api/app-router.ts` 从 `src/features` 组合。

#### Scenario: Router composition uses feature routers

- **WHEN** app router 构建业务路由表
- **THEN** 所有业务 router MUST 来自 `src/features/<feature>`

#### Scenario: Feature tests are colocated

- **WHEN** 测试某个 feature 的 router
- **THEN** 测试文件 MUST 位于对应 feature 的 `tests/` 目录或 feature 内部测试目录

### Requirement: 跨 Feature 导入必须经过公开边界

生产 Feature MUST NOT 直接导入其他 Feature 的 `application`、`domain`、`infrastructure`、`schemas`、`transport`、`admin` 或 `presentation` 内部路径；共享消费者 MUST 使用 `features/contracts` 或目标 Feature 的显式 `public` 出口。

#### Scenario: 导入其他 Feature 的 Infrastructure

- **WHEN** Feature 生产代码直接导入另一 Feature 的 `infrastructure` 文件
- **THEN** 架构门禁 MUST 失败并报告源 Feature、目标 Feature 和导入路径

#### Scenario: 使用公开契约

- **WHEN** Feature 通过 `features/contracts` 或目标 Feature 的 `public` 出口复用稳定模型或能力
- **THEN** 架构门禁 SHALL 允许该依赖
