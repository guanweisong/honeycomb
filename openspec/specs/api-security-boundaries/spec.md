# API Security Boundaries Specification

## Purpose

定义公开 API 与后台 API 的数据暴露、资源可见性和对象关系安全边界，确保敏感字段不会离开服务端、未发布资源不能通过辅助接口访问，并保证评论只能关联有效且一致的公开内容目标。
## Requirements
### Requirement: 用户 API 使用安全响应字段
系统 SHALL 在用户创建、更新和列表接口中仅返回业务所需字段，并且 MUST NOT 返回密码哈希；用户管理 procedure MUST 要求对应 capability，而不得直接按角色数组授权。

#### Scenario: 创建用户返回安全 DTO
- **WHEN** 具有 `user:manage` 能力的用户成功创建用户
- **THEN** 响应包含用户管理所需字段且不包含 `password`

#### Scenario: 更新用户返回安全 DTO
- **WHEN** 具有 `user:manage` 能力的用户成功更新用户
- **THEN** 响应包含用户管理所需字段且不包含 `password`

#### Scenario: 缺少能力访问用户列表
- **WHEN** 已登录用户缺少用户读取能力并调用用户列表接口
- **THEN** 系统返回权限错误且不返回用户邮箱

### Requirement: 评论公共响应不暴露隐私字段
系统 SHALL 使用显式公共评论 DTO 返回评论创建和列表结果，并且 MUST NOT 返回邮箱、IP 或 User-Agent。

#### Scenario: 创建评论成功
- **WHEN** 访客对允许评论的公开资源提交有效评论
- **THEN** 响应仅包含公共评论字段和派生头像

#### Scenario: 评论内部通知
- **WHEN** 系统发送管理员或回复通知邮件
- **THEN** 私有评论字段仅在服务端内部使用且不进入 API 响应

### Requirement: 评论目标必须公开且允许评论
系统 SHALL 在读取或创建评论前验证目标资源存在且已发布；文章及 CUSTOM 目标还必须启用评论。

#### Scenario: 查询未发布资源的评论
- **WHEN** 调用者查询未发布文章或页面的评论
- **THEN** 系统返回 `NOT_FOUND` 且不查询评论列表

#### Scenario: 对关闭评论的文章提交评论
- **WHEN** 调用者向已发布但关闭评论的文章或 CUSTOM 目标提交评论
- **THEN** 系统返回 `FORBIDDEN` 且不插入评论

#### Scenario: 对有效公开资源提交评论
- **WHEN** 页面已发布，或文章及 CUSTOM 目标已发布且启用评论
- **THEN** 系统允许继续执行评论创建

### Requirement: 评论关系保持单一目标和同源父子关系
系统 MUST 要求评论仅关联一个目标，并且回复评论 MUST 与父评论关联同一个资源。

#### Scenario: 输入包含多个评论目标
- **WHEN** 评论输入同时包含多个 `postId`、`pageId` 或 `customId`
- **THEN** 输入校验失败且不访问数据库

#### Scenario: 回复其他资源的评论
- **WHEN** 新评论的目标与父评论目标不一致
- **THEN** 系统返回 `BAD_REQUEST` 且不插入评论或发送通知

#### Scenario: 回复同一资源的评论
- **WHEN** 新评论与父评论的资源标识完全一致
- **THEN** 系统允许创建回复并发送对应通知

### Requirement: 公开内容辅助操作限制已发布状态
系统 SHALL 仅允许公开辅助查询和浏览量更新作用于 `PUBLISHED` 内容。

#### Scenario: 获取未发布文章的分类
- **WHEN** 调用者通过公开接口查询未发布文章的分类
- **THEN** 系统不返回分类信息

#### Scenario: 增加未发布文章或页面的浏览量
- **WHEN** 调用者请求增加未发布文章或页面的浏览量
- **THEN** 系统返回 `NOT_FOUND` 且不修改浏览量

#### Scenario: 增加已发布内容的浏览量
- **WHEN** 调用者请求增加已发布文章或页面的浏览量
- **THEN** 系统原子增加浏览量并返回新值

### Requirement: 后台 API 以 capability 作为授权契约
系统 MUST 为每个后台读取和写入 procedure 声明所需 Permission，并在 handler 执行前完成检查。

#### Scenario: 有能力的编辑者更新文章
- **WHEN** EDITOR 拥有 `post:update` 并调用文章更新接口
- **THEN** 系统允许继续执行既有输入校验和更新流程

#### Scenario: 无能力用户调用后台接口
- **WHEN** 用户已登录但缺少目标 procedure 所需 Permission
- **THEN** 系统返回 `FORBIDDEN` 且不读取或修改目标资源

### Requirement: 全局 API 限流必须有界且故障隔离
Proxy 中的全局 API 限流 MUST 使用确定的等待上限；超时或供应商故障 MUST 按环境定义的安全策略结束请求并记录可观测结果，不得无限等待或抛出未处理异常。

#### Scenario: 生产环境限流服务超时
- **WHEN** 限流供应商在等待上限内没有响应
- **THEN** Proxy 返回 503、记录限流不可用结果且不继续执行目标 API

#### Scenario: 开发环境未配置限流服务
- **WHEN** 本地开发没有配置远程限流凭据
- **THEN** 请求使用明确的本地允许策略继续，且不伪装成远程限流成功

### Requirement: 高成本 procedure 可组合独立限流
tRPC SHALL 提供不复制鉴权和业务规则的可组合限流边界，使验证码、登录相关或高成本 procedure 能声明独立策略。

#### Scenario: 高成本 procedure 达到独立限额
- **WHEN** 调用者达到该 procedure 声明的限额
- **THEN** procedure 在业务 handler 执行前返回可识别的限流错误

### Requirement: 公开内容只披露必要的账户字段

公开文章查询 MUST 为作者返回页面展示所需的最小读取模型，不得携带电子邮箱、权限级别、账户状态或账户内部时间戳。既有缓存中包含的额外账户字段 MUST 在响应前由共享读取 Schema 丢弃。

#### Scenario: 读取公开文章作者

- **WHEN** 匿名或已登录调用方读取公开文章列表或详情
- **THEN** 作者对象 MUST 只包含 `id` 与 `name`

#### Scenario: 读取旧版本文章缓存

- **WHEN** 旧缓存作者对象仍包含账户内部字段
- **THEN** 缓存解码 MUST 丢弃额外字段，不得把它们返回给调用方

### Requirement: 用户资料写入必须经过受保护的应用入口

需要后台 capability 鉴权及公开缓存失效的用户资料写入 MUST 经过 User Application Use Case。身份框架的通用资料更新路由 MUST 被禁用，避免形成竞争写入口。

#### Scenario: 调用通用身份资料更新路由

- **WHEN** 已登录用户请求 Better Auth 通用 `/update-user` 端点
- **THEN** 身份 transport MUST 拒绝该路由，且不得绕过 User Application Use Case 修改资料

#### Scenario: 真实身份 handler 拒绝通用资料更新

- **WHEN** 测试直接向当前认证配置生成的 handler 发送 `/api/auth/update-user` POST 请求
- **THEN** handler MUST 返回 404，且不得要求有效会话或访问用户数据库

### Requirement: 批量写操作拒绝空目标

共享批量删除输入 MUST 至少包含一个有效资源 ID，避免空操作触发数据库调用、通知或公开缓存失效。

#### Scenario: 提交空批量删除

- **WHEN** 调用方提交 `{ ids: [] }`
- **THEN** transport 输入校验 MUST 拒绝请求，且不得进入对应 Application Use Case
