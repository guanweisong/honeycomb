## Purpose

定义评论通知与媒体删除的业务成功边界、失败语义和同步重试能力，使外部副作用失败不会错误覆盖已完成的数据库操作，并保持恢复路径清晰。
## Requirements
### Requirement: 评论提交成功不依赖通知

系统 MUST 以评论数据库写入成功作为创建成功边界，通知准备或邮件发送失败不得把已提交评论转换为 API 失败。

#### Scenario: 通知查询失败

- **WHEN** 评论已创建但通知所需的评论或设置查询失败
- **THEN** API SHALL 返回已创建评论，且系统记录脱敏错误日志

#### Scenario: 邮件发送失败

- **WHEN** 评论已创建但管理员或回复邮件发送失败
- **THEN** API SHALL 保持成功，且系统记录脱敏错误日志

#### Scenario: 数据库创建失败

- **WHEN** 评论数据库写入失败
- **THEN** API MUST 返回失败且不得尝试通知

### Requirement: 媒体删除保留同步重试能力

系统 MUST 在删除媒体数据库记录前删除对应对象存储文件，并在对象删除失败时保留数据库记录。

#### Scenario: 对象存储删除失败

- **WHEN** R2 删除请求失败
- **THEN** 媒体数据库记录 MUST 保持不变，API 返回可重试错误

#### Scenario: 对象删除成功

- **WHEN** 所有目标对象已成功删除或已经不存在
- **THEN** 系统 SHALL 删除对应数据库记录并返回成功

#### Scenario: 数据库删除失败后重试

- **WHEN** 对象已删除但数据库删除失败，随后用户重试
- **THEN** 重复对象删除 SHALL 被视为幂等操作，并再次尝试数据库删除

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

#### Scenario: 评论创建的业务校验顺序

- **WHEN** Application 创建公开评论
- **THEN** 它 MUST 在验证码成功后读取并验证公开目标，在存在父评论时验证父子目标同源，全部成功后才持久化、尽力通知并失效缓存

#### Scenario: 入口限流

- **WHEN** 公开 API 需要请求级速率限制
- **THEN** transport SHALL 在 Use Case 执行前完成限流，且 Application MUST NOT 依赖请求中间件或限流提供商
