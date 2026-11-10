# 业务 Feature 边界

## Purpose

定义业务实现、根 tRPC 组合、纯业务契约和跨 feature 导入的归属，使业务规则不回流共享技术库，并保持浏览器和服务端的真实边界。

## Requirements

### Requirement: Feature owns business implementation

每个业务 feature MUST 在 `src/features/<feature>` 中拥有业务 schema、router、types、rules、server 操作和业务测试。业务概念 MUST NOT 迁入共享 lib 或中央 contracts 目录。浏览器页面、展示组件、交互 hooks、客户端 tRPC action/query 和新增的路由专属展示配置 MUST 归 `src/app`。

#### Scenario: Feature schema is the source of truth

- **WHEN** feature 输入被 router、表单、server 或测试消费
- **THEN** 消费者 MUST 引用该 feature 的权威 schema，不增加只重新导出同一 schema 的文件

#### Scenario: Legacy business module is absent

- **WHEN** 架构门禁扫描源码
- **THEN** src/packages 与集中 features/contracts MUST 不存在，业务实现 MUST 归属于相应 feature

#### Scenario: 浏览器 UI 由 app 拥有

- **WHEN** 新增或迁移浏览器页面、展示组件、交互 hook、客户端 action/query 或展示配置
- **THEN** 实现 MUST 位于对应 app 路由、路由组或其共置目录，`components` 目录不得新增 App Router 入口。Feature 不得保存或反向导入浏览器 UI。

### Requirement: Transport infrastructure is separate from business features

lib/trpc MUST 只承载公共 core/context/client 及传输工具。根业务 router MUST 在 app/trpc/router.ts 组合，服务端 caller MUST 在 app/trpc/server.ts 提供；传输技术库的运行时方向和会话例外 MUST 遵守[依赖方向权威矩阵](../package-layer-architecture/spec.md#requirement-技术依赖不加载业务运行时)。

#### Scenario: Router composition uses feature routers

- **WHEN** 根 router 构建业务路由表
- **THEN** app/trpc/router.ts MUST 组合相应 feature 的 router，procedure 名称与外部类型保持不变

#### Scenario: 客户端引用根 Router 类型

- **WHEN** tRPC 客户端需要 AppRouter 推导输入或输出类型
- **THEN** 它 MAY 使用 type-only 导入，但不得产生根 router 的运行时依赖

#### Scenario: Feature tests are colocated

- **WHEN** 测试 feature 的业务操作或 router
- **THEN** 测试 SHALL 位于该 feature 的 tests 目录或相应实现附近，并直接验证真实行为

### Requirement: 跨 Feature 导入必须经过公开边界

生产 feature MAY 通过目标 feature 的纯 schema/type/catalog 或具名 server 操作复用能力，无需 public barrel。运行时方向与通用组件注入边界 MUST 遵守[依赖方向权威矩阵](../package-layer-architecture/spec.md#requirement-技术依赖不加载业务运行时)。

#### Scenario: 耦合其他 Feature 的 Router

- **WHEN** feature 生产代码运行时导入另一 feature 的 router
- **THEN** 架构门禁 MUST 失败并报告源 feature、目标 feature 和路径

#### Scenario: 使用纯契约

- **WHEN** feature 直接复用其他 feature 拥有的纯 schema、type 或状态目录
- **THEN** 架构门禁 SHALL 允许该依赖，且不得要求经过集中 contracts 转发

#### Scenario: App 组合多个 Feature 的 UI

- **WHEN** 页面需要展示一个或多个 feature 的业务数据
- **THEN** App 路由 MUST 组合 app 拥有的 UI 与各 feature 的纯契约或服务端入口，浏览器不得加载 server 实现。
