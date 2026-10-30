## MODIFIED Requirements

### Requirement: Feature owns business implementation

每个业务 feature MUST 在 `src/features/<feature>` 中拥有业务 schema、router、types、rules、server 操作和业务测试；业务概念 MUST NOT 迁入共享 lib 或中央 contracts 目录。浏览器页面、展示组件、交互 hooks、客户端 tRPC action/query 和展示配置 MUST 归 `src/app`。

#### Scenario: Feature schema is the source of truth

- **WHEN** feature 输入被 router、表单、server 或测试消费
- **THEN** 消费者 MUST 引用该 feature 的权威 schema，不增加只重新导出同一 schema 的文件

#### Scenario: Legacy business module is absent

- **WHEN** 架构门禁扫描源码
- **THEN** `src/packages` 与集中 `features/contracts` MUST 不存在，业务实现 MUST 归属于相应 feature

#### Scenario: Browser UI belongs to app

- **WHEN** 新增或迁移浏览器页面、展示组件、交互 hook、客户端 action/query 或展示配置
- **THEN** 实现 MUST 位于对应 `src/app` 路由组及其 `components` 目录；这些目录 MUST NOT 包含 App Router 入口文件；`src/features` MUST NOT 保存浏览器 UI 或反向导入 app UI

### Requirement: 跨 Feature 导入必须经过公开边界

生产 feature MAY 通过目标 feature 的纯 schema/type/catalog 或 server 操作具体入口复用能力，不要求 public barrel；运行时方向与通用组件注入边界 MUST 遵守[依赖方向权威矩阵](../package-layer-architecture/spec.md#requirement-技术依赖不加载业务运行时)。浏览器 UI 由 app 组合，不得由 feature 跨模块导入 UI。

#### Scenario: 耦合其他 Feature 的 Router

- **WHEN** feature 生产代码运行时导入另一 feature 的 router
- **THEN** 架构门禁 MUST 失败并报告源 feature、目标 feature 和路径

#### Scenario: 使用纯契约

- **WHEN** feature 直接复用其他 feature 拥有的纯 schema、type 或状态目录
- **THEN** 架构门禁 SHALL 允许该依赖，且不得要求经过集中 contracts 转发

#### Scenario: App 组合多个 Feature 的 UI

- **WHEN** 页面需要展示一个或多个 feature 的业务数据
- **THEN** app 路由 MUST 组合 app-owned UI 与各 feature 的契约或服务端入口；浏览器 UI MUST NOT 从 feature 导入另一个 feature 的 UI
