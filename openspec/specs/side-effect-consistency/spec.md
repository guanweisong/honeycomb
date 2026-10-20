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

### Requirement: 媒体删除保留恢复线索

系统 MUST 按媒体普通记录协议在串行写事务检查权限与整批已知引用，先删除并确认对象缺失，再物理删除记录。系统 MUST NOT 保存生命周期或墓碑；对象删除部分成功、结果未知或数据库回滚可能留下失效普通记录，需人工核对。

#### Scenario: 已知引用阻止整批删除

- **WHEN** 任一目标仍被已知内容引用
- **THEN** 系统 MUST 拒绝整批请求，不删除任何对象或记录，也不通过自动置空封面绕过引用保护

#### Scenario: 对象或数据库结果不确定

- **WHEN** 对象删除、缺失核对或数据库提交未能确认完成
- **THEN** 系统 MUST 返回错误并提示人工核对，不声称整批回滚、自动恢复或记录一定仍存在

#### Scenario: 删除完成后的缓存降级

- **WHEN** 所有目标均已确认删除且数据库提交成功，但公开缓存失效失败
- **THEN** 系统 SHALL 返回删除成功及 publicSync degraded，不把缓存失败转换为再次破坏性删除的理由

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
