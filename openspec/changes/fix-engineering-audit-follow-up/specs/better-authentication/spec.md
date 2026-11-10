## ADDED Requirements

### Requirement: 禁用账号撤销已发会话

后台禁用账号 MUST 原子撤销该账号的会话。认证凭据入口 MUST 拒绝已禁用账号的遗留会话。

#### Scenario: 禁用后重放 Cookie

- **WHEN** 账号禁用且客户端重放之前的 Cookie
- **THEN** 会话不能授权凭据操作，重新启用后旧 Cookie 仍失效
