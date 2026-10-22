## Purpose

明确 feature 拥有的业务契约、纯规则、服务端操作和 UI，以及 app、components、lib 的组合与运行时边界，防止为了分层引入无职责跳转。

## Requirements

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

app MUST 承担框架组合，feature MUST NOT 反向依赖 app；纯 schemas/type/catalog/rules MUST NOT 加载数据库、UI、服务端认证或框架实现，server 函数 MAY 直接依赖 Drizzle 和 lib 技术能力。

#### Scenario: 纯规则引入运行时依赖

- **WHEN** 纯规则或纯契约通过直接或间接导入加载数据库、UI 或框架 server
- **THEN** 架构测试 MUST 失败并指出违规路径

#### Scenario: 服务端操作直接查询数据库

- **WHEN** feature server 函数直接使用 lib/db 和 Drizzle 执行业务操作
- **THEN** 架构门禁 SHALL 允许该调用，不要求通过仅转发参数的中间层

### Requirement: Feature 职责使用具体目录入口

Feature MUST 将已有根 types.ts、schema.ts、server.ts 迁入按真实职责命名的 types/、schemas/、server/；MUST NOT 保留旧平铺入口、兼容 barrel 或为无实际需求的模块创建空目录。已有职责清晰的子目录文件 SHALL 保持其所有权，不为目录对称拆散事务。

#### Scenario: 枚举按所属模块单独定义

- **WHEN** feature 中存在 TypeScript enum，包括展示名称或组件对齐 enum
- **THEN** 每个枚举 MUST 位于所属 feature 的 types/ 独立文件中，一个文件仅一个 enum；展示枚举不得成为业务 schema、规则或持久化的依赖

#### Scenario: 迁移服务端实现

- **WHEN** 根 server.ts 拆入具名 server 文件
- **THEN** 数据库及副作用操作入口 MUST 保持 server-only，浏览器不得通过直接或间接导入加载服务端实现，纯转换 helper 不因目录名称变成公开客户端契约

#### Scenario: 无独立契约需求

- **WHEN** dashboard 等模块的返回值可由真实操作与 transport 推导
- **THEN** 系统 MUST NOT 为目录对称添加空 types/schemas 或无用途模型

#### Scenario: 服务端测试按被测职责就近组织

- **WHEN** 整理 Feature 根 server.test.ts 或 server.integration.test.ts
- **THEN** 测试 MUST 迁入所属 server/ 并跟随实际实现具名；单职责文件 SHALL 整体迁移，混合职责 MAY 拆分，跨操作完整事务/并发场景 MUST 保留在具名 integration 测试中；MUST NOT 保留笼统根入口、删减断言或重复昂贵 fixture，E2E SHALL 继续位于 tests/e2e
