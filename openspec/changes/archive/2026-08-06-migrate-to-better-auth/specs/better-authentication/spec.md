## ADDED Requirements

### Requirement: 用户名密码登录

系统 MUST 支持用户使用现有用户名和密码登录，并在创建会话前验证用户状态和 Turnstile token。

#### Scenario: 有效用户名密码登录

- **WHEN** 启用状态的用户提交正确用户名、正确密码和有效 Turnstile token
- **THEN** 系统创建 Better Auth session，并返回登录成功结果

#### Scenario: 密码错误

- **WHEN** 用户提交不存在的用户名或错误密码
- **THEN** 系统拒绝登录，不创建 session，并返回通用认证失败结果

#### Scenario: Turnstile 校验失败

- **WHEN** 用户名和密码正确但 Turnstile token 无效、缺失或验证失败
- **THEN** 系统拒绝登录，不创建 session

#### Scenario: 用户已禁用

- **WHEN** 用户凭据正确但用户状态不是启用
- **THEN** 系统拒绝登录，不创建 session

### Requirement: 现有用户密码迁移

系统 MUST 将现有 `user` 表中有 bcrypt 密码的用户迁移为 Better Auth credential account，并保留原用户 ID、用户名、密码哈希、等级、状态和业务关联。

#### Scenario: 首次迁移有密码用户

- **WHEN** 执行密码迁移且用户存在密码但没有 credential account
- **THEN** 系统为该用户创建一个引用原用户 ID 的 credential account，并保留原密码哈希

#### Scenario: 重复执行迁移

- **WHEN** 对已经完成迁移的用户再次执行密码迁移
- **THEN** 系统不创建重复 credential account，且命令成功结束

#### Scenario: 无密码用户

- **WHEN** 执行密码迁移且用户没有密码
- **THEN** 系统不创建 credential account，且不修改该用户

### Requirement: OAuth 登录

系统 MUST 支持已配置的 Google、GitHub 和 Apple OAuth provider，并按安全的已验证邮箱匹配现有用户。

#### Scenario: 已存在用户使用 OAuth 登录

- **WHEN** OAuth provider 返回与现有启用用户匹配的已验证邮箱
- **THEN** 系统复用原用户 ID，创建或复用对应 account，并创建 Better Auth session

#### Scenario: OAuth 用户首次登录

- **WHEN** OAuth provider 返回有效已验证邮箱且系统不存在对应用户
- **THEN** 系统创建业务用户和 OAuth account，使用默认等级和启用状态创建 session

#### Scenario: OAuth 缺少邮箱

- **WHEN** OAuth provider 未返回可验证邮箱
- **THEN** 系统拒绝登录，不创建业务用户或 session

#### Scenario: OAuth 用户已禁用

- **WHEN** OAuth provider 的邮箱匹配已禁用业务用户
- **THEN** 系统拒绝登录，不创建 session，且不修改用户等级或状态

### Requirement: 会话读取和登出

系统 MUST 通过 Better Auth session 提供服务端会话读取、客户端 session 状态和登出能力。

#### Scenario: 服务端读取有效会话

- **WHEN** tRPC 请求携带有效 Better Auth session Cookie
- **THEN** 系统读取对应用户，并再次确认用户仍为启用状态后注入 tRPC context

#### Scenario: 会话已失效

- **WHEN** tRPC 请求没有 session、session 已过期或关联用户不存在
- **THEN** 系统将当前用户视为未登录

#### Scenario: 用户登出

- **WHEN** 已登录用户执行登出
- **THEN** 系统撤销或删除当前 Better Auth session，清理客户端认证状态并跳转到登录页

### Requirement: 认证 Route Handler

系统 MUST 在 `/api/auth/[...all]` 暴露 Better Auth 所需的 GET 和 POST Route Handler，并保留 OAuth 回调和 session API 的正常工作。

#### Scenario: 认证请求进入 Route Handler

- **WHEN** 客户端请求 `/api/auth/*` 下的 Better Auth endpoint
- **THEN** Route Handler 将请求交给 Better Auth，并返回符合客户端协议的响应

#### Scenario: 旧 NextAuth endpoint

- **WHEN** 客户端请求旧的 `/api/auth/[...nextauth]` endpoint
- **THEN** 系统不再依赖 NextAuth 处理该请求，发布后的客户端使用新的 Better Auth endpoint
