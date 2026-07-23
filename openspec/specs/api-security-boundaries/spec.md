# API Security Boundaries Specification

## Purpose

定义公开 API 与后台 API 的数据暴露、资源可见性和对象关系安全边界，确保敏感字段不会离开服务端、未发布资源不能通过辅助接口访问，并保证评论只能关联有效且一致的公开内容目标。

## Requirements

### Requirement: 用户 API 使用安全响应字段
系统 SHALL 在用户创建、更新和列表接口中仅返回业务所需字段，并且 MUST NOT 返回密码哈希。

#### Scenario: 创建用户返回安全 DTO
- **WHEN** 管理员成功创建用户
- **THEN** 响应包含用户管理所需字段且不包含 `password`

#### Scenario: 更新用户返回安全 DTO
- **WHEN** 管理员成功更新用户
- **THEN** 响应包含用户管理所需字段且不包含 `password`

#### Scenario: 访客访问用户列表
- **WHEN** `GUEST` 调用用户列表接口
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
