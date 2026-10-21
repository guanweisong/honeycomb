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

系统 SHALL 支持配置的 OAuth 提供商登录，并将 OAuth 身份关联到应用用户；对已有用户的 OAuth 账号关联 SHALL 要求用户显式确认。

#### Scenario: 已验证邮箱匹配现有用户

- **WHEN** OAuth 提供商返回已验证邮箱且该邮箱对应现有用户
- **THEN** 系统不自动创建关联，除非用户已经通过账号安全页主动发起关联流程

#### Scenario: 显式关联成功

- **WHEN** 已登录用户从账号安全页主动发起 OAuth 关联并完成授权
- **THEN** 系统将 OAuth account 关联到当前用户并返回账号安全页

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

### Requirement: 认证安全事件记录

系统 SHALL 将认证成功、认证失败、主动退出和退出其他设备事件写入登录历史，并保留原有认证结果和会话行为。

#### Scenario: 认证事件不影响主流程

- **WHEN** 登录历史写入失败
- **THEN** 系统仍按原认证结果处理请求，同时记录可观测错误

### Requirement: 已登录用户删除 Passkey

系统 SHALL 允许已登录用户通过确认交互删除自己的 Passkey，并在成功后同步当前凭据列表。

#### Scenario: 删除已注册 Passkey

- **WHEN** 已登录用户确认删除一个已注册 Passkey
- **THEN** 系统调用 Better Auth 删除能力并刷新账号安全页显示的凭据列表

### Requirement: 后台账号凭据策略必须与认证配置一致

系统 MUST 由身份模块提供唯一的密码长度策略，并由 Better Auth、后台账号写入契约和最终凭据写入入口共同复用。后台账号邮箱 MUST 是合法邮箱格式，密码 MUST 为 6 至 128 个字符。

#### Scenario: 创建后台账号时拒绝弱密码

- **WHEN** 管理员提交密码短于 6 个字符或长于 128 个字符的账号创建请求
- **THEN** 系统 MUST 在写入用户和凭据前拒绝请求

#### Scenario: 更新后台账号时拒绝非法凭据

- **WHEN** 管理员提交格式非法的邮箱或不符合长度策略的新密码
- **THEN** 系统 MUST 返回输入校验失败且 MUST NOT 修改账号凭据

#### Scenario: 直接凭据写入不能绕过策略

- **WHEN** 内部调用者绕过后台表单直接请求设置不符合策略的密码
- **THEN** 最终凭据写入入口 MUST 拒绝生成和保存哈希

### Requirement: 后台邮箱写入与审计规范化保持一致

系统 MUST 对后台新建账号及实际修改的邮箱使用与认证 SDK 一致的 JavaScript 小写规范化，并在同一写事务内拒绝与其他账号规范化后相同的邮箱。系统 MUST NOT 自动迁移历史邮箱，且 MUST 保留整表单原样回传的未修改历史邮箱。用户名登录语义 MUST 保持不变。 此保证限于受控后台写入，不是新的数据库大小写唯一索引，也不保证绕过后台的直接写入；混合大小写历史邮箱的认证可用性不因本次审计匹配而自动修复。

#### Scenario: 未来后台写入发生大小写碰撞

- **WHEN** 新建账号或实际修改邮箱的规范化结果与另一账号一致
- **THEN** 系统拒绝整个写事务，不修改用户或凭据

#### Scenario: 无关字段编辑原样回传历史邮箱

- **WHEN** 更新表单原样回传现有邮箱且只修改其他字段
- **THEN** 系统保留现有邮箱拼写，不隐式迁移历史邮箱

#### Scenario: 失败认证审计匹配歧义

- **WHEN** 审计邮箱按同一规范化方式匹配多个历史账号
- **THEN** 审计不归属任何一个候选账号

#### Scenario: 密码包含边界空白

- **WHEN** 用户提交符合统一长度策略的密码，包括合法的纯空白密码
- **THEN** 登录表单按原始字符验证并传递密码，不使用 trim 改变其可接受性
