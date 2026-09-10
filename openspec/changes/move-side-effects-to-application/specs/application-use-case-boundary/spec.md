## MODIFIED Requirements

### Requirement: 业务操作必须经过 Application Use Case

任何改变持久化状态、触发与业务结果相关的缓存、通知、对象存储、验证码或其他外部副作用，或需要多个步骤协调的行为 MUST 由 feature-owned Application Use Case 承载；简单查询 MAY 由 Server Query/Repository 直接提供。tRPC、Server Action、Route Handler 和页面只能负责输入校验、入口鉴权、依赖组装、调用与结果映射，不得直接执行上述业务副作用；可缓存 Server Component MUST NOT 在渲染阶段调用写操作。API 限流、会话解析和传输错误协议 SHALL 保留在传输边界。

#### Scenario: tRPC 调用业务写操作

- **WHEN** procedure 接收合法输入
- **THEN** 它 MUST 调用对应 Use Case，并不得直接编排领域规则、数据库写入或与写入结果相关的外部副作用

#### Scenario: 多种入口调用同一业务操作

- **WHEN** tRPC 和 Server Action 提供相同业务能力
- **THEN** 两者 MUST 调用同一个 Use Case，且缓存与外部服务副作用的顺序和失败语义 MUST 一致

#### Scenario: 简单查询

- **WHEN** 查询只读取数据，且不包含写入、副作用或跨步骤业务协调
- **THEN** Server Component 或 Query MAY 直接调用 Query/Repository，不得因此创建空的 Use Case 或 Domain 层

#### Scenario: 静态内容页面记录浏览量

- **WHEN** 可缓存 Server Component 渲染文章或页面详情
- **THEN** 它 MUST NOT 调用浏览量写操作，计数由独立请求承担

#### Scenario: 传输入口保护

- **WHEN** API 请求需要限流、会话解析、入口 capability 鉴权或协议错误映射
- **THEN** transport SHALL 在调用 Use Case 前完成这些职责，且不得把 HTTP 或 tRPC 类型传入 Application
