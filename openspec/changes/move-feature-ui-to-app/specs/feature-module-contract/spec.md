## MODIFIED Requirements

### Requirement: Feature 模块必须具有单一职责边界

每个业务 feature MUST 在自己的目录中拥有 router、schema、type、纯规则和 server 操作；浏览器 UI MUST 位于 `src/app`，通用 UI 位于 `src/components`。文件与目录按需建立，不得创建空目录、无消费者 barrel 或人工 application/domain/infrastructure 层。

#### Scenario: 业务模块访问其他模块

- **WHEN** 一个 feature 需要另一个 feature 的业务概念或公共能力
- **THEN** 它 MAY 直接复用对方拥有的纯契约或 server 操作入口，但 MUST NOT 导入业务 UI、耦合对方 router、反向导入 app，或违反纯模块与浏览器/服务端边界；不要求 public barrel

#### Scenario: 简单 CRUD 模块

- **WHEN** 一个 feature 只需要简单查询或写入
- **THEN** 它 SHALL 使用直接数据库访问的 server 函数，不要求 Repository 接口、factory、Use Case 或聚合

#### Scenario: App 组合层使用业务入口

- **WHEN** app 路由、布局或根 router 组合 feature
- **THEN** app SHALL 使用对应 feature 的明确 router、server 操作或纯业务契约；浏览器页面及组件 MUST 由 app 路由组拥有，不要求新增只转发的 public barrel
