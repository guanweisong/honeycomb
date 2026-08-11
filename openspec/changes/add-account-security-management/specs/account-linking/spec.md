## ADDED Requirements

### Requirement: 关联账号列表

系统 SHALL 在账号安全页展示当前用户已经关联的认证方式，并只展示当前环境已配置的 OAuth provider。

#### Scenario: 展示已关联账号

- **WHEN** 已登录用户打开“关联账号”Tab
- **THEN** 系统返回该用户的 account 列表，并展示 provider、关联状态和必要的非敏感标识

#### Scenario: 未配置 provider 不展示

- **WHEN** 某个 OAuth provider 未配置 client id 或 secret
- **THEN** 系统不展示该 provider 的绑定入口

### Requirement: 显式绑定 OAuth 账号

系统 SHALL 允许已登录用户主动发起 OAuth provider 绑定，并在回调成功后将 provider account 关联到当前用户。

#### Scenario: 绑定成功

- **WHEN** 用户点击未关联 provider 的绑定按钮并完成 OAuth 授权
- **THEN** 系统将该 provider account 关联到当前用户，并刷新关联账号列表

#### Scenario: provider 已关联

- **WHEN** 用户已经关联某 provider
- **THEN** 系统隐藏或禁用该 provider 的绑定按钮，避免重复关联

#### Scenario: 绑定失败

- **WHEN** OAuth 授权失败、provider 不可信或 account 已属于其他用户
- **THEN** 系统不改变当前账号关系，并向用户展示可理解的失败提示

### Requirement: 解绑 OAuth 账号

系统 SHALL 允许用户在确认后解绑指定的 OAuth account，并 SHALL 防止用户失去最后一个认证方式。

#### Scenario: 确认解绑

- **WHEN** 用户确认解绑一个非最后认证方式的 account
- **THEN** 系统删除该关联并刷新关联账号列表

#### Scenario: 取消解绑

- **WHEN** 用户关闭解绑确认对话框或选择取消
- **THEN** 系统不删除 account

#### Scenario: 解绑最后账号

- **WHEN** 用户尝试解绑唯一的认证 account
- **THEN** 系统拒绝操作并保留该 account
