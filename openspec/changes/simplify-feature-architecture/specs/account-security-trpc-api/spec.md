## RENAMED Requirements

- FROM: `### Requirement: 登录历史使用中立账号安全领域包`
- TO: `### Requirement: 登录历史由 user feature 的账号安全模块持有`

## MODIFIED Requirements

### Requirement: 登录历史由 user feature 的账号安全模块持有

系统 MUST 将登录历史模型、持久化操作、查询限制和保留策略放在 `features/user/account-security`；`app/_auth` 的认证事件组合和 feature 的 tRPC router SHALL 调用该模块。登录历史纯规则和持久化操作 MUST NOT 反向依赖 Auth 实例或 tRPC，MUST NOT 为此建立独立 packages 层级。

#### Scenario: Auth 记录认证事件

- **WHEN** Better Auth hooks 或请求审计需要记录登录、失败、退出事件
- **THEN** `app/_auth` 认证事件组合调用账号安全模块写入记录，而不通过 tRPC

#### Scenario: tRPC 查询登录历史

- **WHEN** `accountSecurity.loginHistory` 查询当前用户历史
- **THEN** feature 的 tRPC router 调用账号安全持久化操作读取安全数据库列，而持久化操作不引用 tRPC 类型

#### Scenario: 识别 Better Auth 认证路径

- **WHEN** 系统需要将 Better Auth 路径映射为密码、Passkey、OAuth 或会话事件
- **THEN** 该协议识别逻辑保留在 Auth，且不承担登录历史存储职责
