## ADDED Requirements

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

系统 MUST 在 Application Use Case 中表达媒体删除顺序，数据库 Repository 不得直接依赖对象存储 SDK。

#### Scenario: 组装媒体删除

- **WHEN** tRPC Router 接收媒体删除请求
- **THEN** Router SHALL 只注入 Media Repository 和 Media Storage 并调用 Use Case
