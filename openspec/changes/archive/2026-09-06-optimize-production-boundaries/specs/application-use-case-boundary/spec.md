## MODIFIED Requirements

### Requirement: 业务操作必须经过 Application Use Case

任何改变持久化状态、触发外部副作用或需要多个步骤协调的行为 MUST 由 feature-owned Application Use Case 承载；简单查询 MAY 由 Server Query/Repository 直接提供。tRPC、Server Action、Route Handler 和页面只能负责边界适配；可缓存 Server Component MUST NOT 在渲染阶段调用写操作。

#### Scenario: tRPC 调用业务写操作

- **WHEN** procedure 接收合法输入
- **THEN** 它 MUST 调用对应 use case，并不得直接编排领域规则或数据库写入

#### Scenario: 多种入口调用同一业务操作

- **WHEN** tRPC 和 Server Action 提供相同业务能力
- **THEN** 两者 MUST 调用同一个 use case，且行为测试 MUST 验证结果一致

#### Scenario: 简单查询

- **WHEN** 查询只读取数据，且不包含写入、副作用或跨步骤业务协调
- **THEN** Server Component 或 Query MAY 直接调用 Query/Repository，不得因此创建空的 Use Case 或 Domain 层

#### Scenario: 静态内容页面记录浏览量

- **WHEN** 可缓存 Server Component 渲染文章或页面详情
- **THEN** 它 MUST NOT 调用浏览量写操作，计数由独立请求承担
