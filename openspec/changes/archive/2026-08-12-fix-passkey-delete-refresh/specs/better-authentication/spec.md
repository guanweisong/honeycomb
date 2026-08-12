## ADDED Requirements

### Requirement: 已登录用户删除 Passkey
系统 SHALL 允许已登录用户通过确认交互删除自己的 Passkey，并在成功后同步当前凭据列表。

#### Scenario: 删除已注册 Passkey
- **WHEN** 已登录用户确认删除一个已注册 Passkey
- **THEN** 系统调用 Better Auth 删除能力并刷新账号安全页显示的凭据列表
