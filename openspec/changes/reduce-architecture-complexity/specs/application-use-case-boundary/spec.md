## ADDED Requirements

### Requirement: 业务操作必须经过 Application Use Case
任何改变持久化状态、触发外部副作用或需要多个步骤协调的行为 MUST 由 feature-owned Application Use Case 承载；简单查询 MAY 由 Server Query/Repository 直接提供。tRPC、Server Action、Route Handler 和页面只能负责边界适配。

#### Scenario: tRPC 调用业务写操作
- **WHEN** procedure 接收合法输入
- **THEN** 它 MUST 调用对应 use case，并不得直接编排领域规则或数据库写入

#### Scenario: 多种入口调用同一业务操作
- **WHEN** tRPC 和 Server Action 提供相同业务能力
- **THEN** 两者 MUST 调用同一个 use case，且行为测试 MUST 验证结果一致

#### Scenario: 简单查询
- **WHEN** 查询只读取数据，且不包含写入、副作用或跨步骤业务协调
- **THEN** Server Component 或 Query MAY 直接调用 Query/Repository，不得因此创建空的 Use Case 或 Domain 层

### Requirement: Repository 接口默认归属 Application
业务 Use Case MUST 依赖位于 Application 的 Repository 接口，Infrastructure MUST 提供具体实现；Domain MUST NOT 访问 Repository。

#### Scenario: Repository 实现替换
- **WHEN** 持久化实现或测试 fake 发生替换
- **THEN** Use Case 的业务代码 MUST 不需要依赖或修改 Infrastructure 实现细节

### Requirement: 纯转发层不得作为业务抽象保留
没有独立校验、授权、事务、转换、缓存或副作用职责的 wrapper MUST NOT 继续作为独立业务层存在。

#### Scenario: 仅转发参数的 service
- **WHEN** service 仅原样调用另一个函数并返回结果
- **THEN** 迁移检查 MUST 将其标记为可删除，并要求调用方改用实际职责所在的入口
