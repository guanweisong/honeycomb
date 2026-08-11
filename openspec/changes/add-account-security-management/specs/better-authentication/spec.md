## MODIFIED Requirements

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

### Requirement: 认证安全事件记录

系统 SHALL 将认证成功、认证失败、主动退出和退出其他设备事件写入登录历史，并保留原有认证结果和会话行为。

#### Scenario: 认证事件不影响主流程

- **WHEN** 登录历史写入失败
- **THEN** 系统仍按原认证结果处理请求，同时记录可观测错误
