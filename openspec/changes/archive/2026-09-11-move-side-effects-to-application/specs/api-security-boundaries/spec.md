## ADDED Requirements

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
