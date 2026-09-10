## MODIFIED Requirements

### Requirement: 副作用编排保持最小边界

系统 MUST 在 Application Use Case 中表达缓存失效、评论验证码与通知、媒体对象存储等业务副作用的顺序与失败语义。Application MUST 只依赖拥有稳定业务语义的最小端口，不得导入 Next.js、tRPC、数据库实现、对象存储 SDK 或邮件 SDK；Infrastructure MUST 提供具体适配器。

#### Scenario: 组装媒体删除

- **WHEN** tRPC Router 接收媒体删除请求
- **THEN** Router SHALL 只注入 Media Repository 和 Media Storage 并调用 Use Case

#### Scenario: 组装公开内容写入

- **WHEN** tRPC Router 接收会影响公开读取结果的写入请求
- **THEN** Router SHALL 注入 Repository 和 Public Content Invalidator 并调用 Use Case，不得直接调用缓存失效方法

#### Scenario: 组装评论创建

- **WHEN** tRPC Router 接收公开评论创建请求
- **THEN** Router SHALL 注入验证码、Repository、通知与缓存端口，由 Application 决定验证、写入、通知和缓存失效顺序

#### Scenario: 入口限流

- **WHEN** 公开 API 需要请求级速率限制
- **THEN** transport SHALL 在 Use Case 执行前完成限流，且 Application MUST NOT 依赖请求中间件或限流提供商
