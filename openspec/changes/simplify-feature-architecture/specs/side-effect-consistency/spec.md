## MODIFIED Requirements

### Requirement: 副作用编排保持最小边界

系统 MUST 在 feature server 函数中表达缓存失效、评论验证码与通知、媒体对象存储等业务副作用的顺序与失败语义。server 函数 MAY 直接使用数据库和 lib 技术适配器，不要求 Repository 或依赖工厂；真实外部 SDK 与缓存框架细节 SHALL 保留在具名技术适配器。

#### Scenario: 组装媒体删除

- **WHEN** tRPC Router 接收媒体删除请求
- **THEN** Router SHALL 调用 Media server 操作，由该操作协调数据库与对象存储

#### Scenario: 组装公开内容写入

- **WHEN** tRPC Router 接收会影响公开读取结果的写入请求
- **THEN** Router SHALL 调用对应 server 操作，由该操作决定缓存计划与时机

#### Scenario: 组装评论创建

- **WHEN** tRPC Router 接收公开评论创建请求
- **THEN** Router SHALL 调用 Comment server 操作，由该操作决定验证码、目标校验、写入、通知和缓存失效顺序

#### Scenario: 评论创建的业务校验顺序

- **WHEN** Comment server 函数创建公开评论
- **THEN** 它 MUST 在验证码成功后读取并验证公开目标，在存在父评论时验证父子目标同源，全部成功后才持久化、尽力通知并失效缓存

#### Scenario: 入口限流

- **WHEN** 公开 API 需要请求级速率限制
- **THEN** transport SHALL 在 server 操作执行前完成限流，且纯业务输入 MUST NOT 包含请求中间件或限流提供商对象
