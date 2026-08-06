## Purpose

为应用提供基于 Better Auth 的统一认证能力，兼容用户名密码、OAuth、会话管理以及现有用户凭据迁移。

## Requirements

### Requirement: 用户名密码登录

系统 SHALL 支持用户通过用户名和密码登录，并在登录成功后建立 Better Auth 会话。

#### Scenario: 合法凭据登录成功

- **WHEN** 用户提交存在且启用的用户名和正确密码
- **THEN** 系统创建 Better Auth 会话并返回登录成功结果

#### Scenario: 密码错误

- **WHEN** 用户提交的密码不正确
- **THEN** 系统拒绝登录且不创建会话

#### Scenario: Turnstile 校验失败

- **WHEN** 启用了 Turnstile 且校验失败
- **THEN** 系统拒绝登录且不创建会话

#### Scenario: 用户已禁用

- **WHEN** 用户账号已被禁用
- **THEN** 系统拒绝登录且不创建会话

### Requirement: 现有用户密码迁移

系统 SHALL 在现有用户首次使用用户名密码登录时，将兼容的旧密码凭据迁移为 Better Auth credential account。

#### Scenario: 首次登录迁移成功

- **WHEN** 现有用户使用正确密码首次登录且不存在 Better Auth credential account
- **THEN** 系统验证旧密码、创建 credential account 并建立会话

#### Scenario: 重复登录幂等

- **WHEN** 用户已存在 Better Auth credential account 后再次使用正确密码登录
- **THEN** 系统复用现有凭据，不创建重复 account，并建立会话

#### Scenario: 用户无密码凭据

- **WHEN** 用户没有可迁移的旧密码凭据
- **THEN** 系统拒绝用户名密码登录并提示使用可用的认证方式

### Requirement: OAuth 登录

系统 SHALL 支持配置的 OAuth 提供商登录，并将 OAuth 身份关联到应用用户。

#### Scenario: 已验证邮箱匹配现有用户

- **WHEN** OAuth 提供商返回已验证邮箱且该邮箱对应现有用户
- **THEN** 系统将 OAuth account 关联到该用户并建立会话

#### Scenario: 首次 OAuth 登录

- **WHEN** OAuth 提供商返回有效且已验证的邮箱，但系统中不存在对应用户
- **THEN** 系统创建用户和 OAuth account 并建立会话

#### Scenario: OAuth 缺少邮箱

- **WHEN** OAuth 提供商未返回邮箱
- **THEN** 系统拒绝登录且不创建不完整的用户

#### Scenario: OAuth 用户已禁用

- **WHEN** OAuth 身份对应的用户已被禁用
- **THEN** 系统拒绝登录且不创建会话

### Requirement: 会话读取和登出

系统 SHALL 提供服务端会话读取和登出能力，并在登出后使会话失效。

#### Scenario: 读取当前会话

- **WHEN** 请求携带有效 Better Auth 会话
- **THEN** 系统返回当前用户及其会话信息

#### Scenario: 无效会话

- **WHEN** 请求未携带会话或携带已失效会话
- **THEN** 系统返回未认证结果

#### Scenario: 登出

- **WHEN** 已登录用户执行登出
- **THEN** 系统使当前会话失效并清理客户端认证状态

### Requirement: 认证 Route Handler

系统 SHALL 暴露 Better Auth 所需的认证 Route Handler，支持认证客户端调用的 GET 和 POST 请求。

#### Scenario: 认证请求转发

- **WHEN** 客户端向认证路由发送 Better Auth 支持的 GET 或 POST 请求
- **THEN** Route Handler 将请求交给 Better Auth 处理并返回对应响应
