## ADDED Requirements

### Requirement: Admin 当前用户查询必须通过应用边界

系统 MUST 让 Admin 当前用户查询通过 Identity/Application 层的窄接口获取用户数据，App Router 模块不得直接导入数据库连接或 Drizzle schema。

#### Scenario: 当前会话对应启用用户

- **WHEN** 请求包含有效会话且对应用户状态为 `ENABLE`
- **THEN** 兼容入口返回与现有 `AdminUser` 完全一致的字段和值

#### Scenario: 无会话或用户不可用

- **WHEN** 请求没有用户会话，或用户不存在/状态不是 `ENABLE`
- **THEN** 兼容入口返回 `null`

### Requirement: 现有调用契约保持兼容

系统 MUST 保留 `getAdminUser(headers: Headers): Promise<AdminUser | null>` 的调用方式，不改变路由、认证协议、权限规则或错误语义。

#### Scenario: 既有 Admin 页面继续使用原入口

- **WHEN** Admin 布局调用现有 `getAdminUser` 入口
- **THEN** 调用签名和返回结构保持兼容
