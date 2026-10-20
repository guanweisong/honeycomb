## MODIFIED Requirements

### Requirement: Feature owns business implementation

每个业务 feature MUST 在 src/features/<feature> 中拥有业务 schema、router、types、rules、server 操作、UI 和测试；业务概念 MUST NOT 迁入共享 lib 或中央 contracts 目录。

#### Scenario: Feature schema is the source of truth

- **WHEN** feature 输入被 router、表单、server 或测试消费
- **THEN** 消费者 MUST 引用该 feature 的权威 schema，不增加只重新导出同一 schema 的文件

#### Scenario: Legacy business module is absent

- **WHEN** 架构门禁扫描源码
- **THEN** src/packages 与集中 features/contracts MUST 不存在，业务实现 MUST 归属于相应 feature

### Requirement: Transport infrastructure is separate from business features

lib/trpc MUST 只承载公共 core/context/client 及传输工具。根业务 router MUST 在 app/_trpc/router.ts 组合，服务端 caller MUST 在 app/_trpc/server.ts 提供；lib/trpc MUST NOT 组合或运行时加载根 router 及 feature router；context 仅为会话读取延迟加载 src/auth.ts 的既有技术集成 MAY 保留，认证框架组合仍归 app/_auth。

#### Scenario: Router composition uses feature routers

- **WHEN** 根 router 构建业务路由表
- **THEN** app/_trpc/router.ts MUST 组合相应 feature 的 router，procedure 名称与外部类型保持不变

#### Scenario: 客户端引用根 Router 类型

- **WHEN** tRPC 客户端需要 AppRouter 推导输入或输出类型
- **THEN** 它 MAY 使用 type-only 导入，但不得产生根 router 的运行时依赖

#### Scenario: Feature tests are colocated

- **WHEN** 测试 feature 的业务操作或 router
- **THEN** 测试 SHALL 位于该 feature 的 tests 目录或相应实现附近，并直接验证真实行为

### Requirement: 跨 Feature 导入必须经过公开边界

生产 feature MAY 通过目标 feature 的纯 schema/type/catalog、有意复用的具名 UI 或 server 操作具体入口复用能力，不要求 public barrel；MUST NOT 耦合另一 feature router、反向导入 app，或违反纯模块/浏览器的运行时边界。通用 components MUST 通过注入接入业务能力，不加载 feature 运行时。

#### Scenario: 耦合其他 Feature 的 Router

- **WHEN** feature 生产代码运行时导入另一 feature 的 router
- **THEN** 架构门禁 MUST 失败并报告源 feature、目标 feature 和路径

#### Scenario: 使用纯契约

- **WHEN** feature 直接复用其他 feature 拥有的纯 schema、type 或状态目录
- **THEN** 架构门禁 SHALL 允许该依赖，且不得要求经过集中 contracts 转发

#### Scenario: 复用所属业务的 UI 或服务端操作

- **WHEN** Post 使用 user/admin/use-current-user、category/admin/category-title、media/components/PhotoPicker，或服务端消费者复用其他 feature 的明确 server 操作
- **THEN** 该依赖 SHALL 允许直接指向有意复用的具体入口，不为目录形式增加 public 或 contracts 转发；浏览器不得因此加载 server 实现
