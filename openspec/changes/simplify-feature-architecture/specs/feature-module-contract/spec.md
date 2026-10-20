## MODIFIED Requirements

### Requirement: Feature 模块必须具有单一职责边界

每个业务 feature MUST 在自己的目录中拥有 router、schema、type、纯规则、server 操作和业务 UI；文件与目录按需建立，不得创建空目录、无消费者 barrel 或人工 application/domain/infrastructure 层。

#### Scenario: 业务模块访问其他模块

- **WHEN** 一个 feature 需要另一个 feature 的业务概念或公共能力
- **THEN** 它 MAY 直接复用对方拥有的纯契约、具名 UI 或 server 操作入口，但 MUST NOT 耦合对方 router、反向导入 app，或违反纯模块与浏览器/服务端边界；不要求 public barrel

#### Scenario: 简单 CRUD 模块

- **WHEN** 一个 feature 只需要简单查询或写入
- **THEN** 它 SHALL 使用直接数据库访问的 server 函数，不要求 Repository 接口、factory、Use Case 或聚合

#### Scenario: App 组合层使用业务入口

- **WHEN** app 路由、布局或根 router 组合 feature
- **THEN** app SHALL 使用对应 feature 的明确 router/server/admin/public 或其他有意复用的具体入口；不要求新增只转发的 public barrel

### Requirement: 模块依赖方向必须可自动验证

app MUST 承担框架组合，feature MUST NOT 反向依赖 app；纯 schema/type/catalog/rules MUST NOT 加载数据库、UI、服务端认证或框架实现，server 函数 MAY 直接依赖 Drizzle 和 lib 技术能力。

#### Scenario: 纯规则引入运行时依赖

- **WHEN** 纯规则或纯契约通过直接或间接导入加载数据库、UI 或框架 server
- **THEN** 架构测试 MUST 失败并指出违规路径

#### Scenario: 服务端操作直接查询数据库

- **WHEN** feature server 函数直接使用 lib/db 和 Drizzle 执行业务操作
- **THEN** 架构门禁 SHALL 允许该调用，不要求通过仅转发参数的中间层
