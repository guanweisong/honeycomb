## ADDED Requirements

### Requirement: Feature 模块必须具有单一职责边界
每个业务 feature MUST 明确区分领域规则、应用用例、外部适配、传输适配和展示代码；不需要某层时不得创建空目录。feature 之间 MUST 只能通过公开契约或 Application 边界交互。

#### Scenario: 业务模块访问其他模块
- **WHEN** 一个 feature 需要使用另一个 feature 的能力
- **THEN** 它 MUST 通过对方的公开契约或稳定查询接口访问，且不得导入对方的 admin、infrastructure 或内部 router 文件

#### Scenario: 简单 CRUD 模块
- **WHEN** 一个 feature 不包含复杂聚合规则
- **THEN** 它 MUST 使用轻量用例和 repository 结构，不得为了模板完整性创建空的领域层

### Requirement: 模块依赖方向必须可自动验证
模块依赖 MUST 从路由和展示层指向传输/应用层，再指向领域和基础设施端口；领域层 MUST NOT 依赖框架、数据库或传输层。

#### Scenario: 引入反向依赖
- **WHEN** domain 或 application 代码导入 Drizzle、Next.js 或 tRPC server
- **THEN** 架构测试 MUST 失败并指出违规文件和允许的替代边界
