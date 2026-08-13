## ADDED Requirements

### Requirement: 生产认证密钥强度
系统在生产启动时 MUST 拒绝长度小于 32 个字符或明显低熵的 `AUTH_SECRET`，并且错误信息 MUST 不回显密钥值。

#### Scenario: 生产密钥过短
- **WHEN** 生产环境的 `AUTH_SECRET` 少于 32 个字符
- **THEN** 应用在开始提供请求前以仅包含变量名和原因的错误失败

#### Scenario: 生产密钥符合强度要求
- **WHEN** 生产环境的 `AUTH_SECRET` 至少 32 个字符且满足熵启发式要求
- **THEN** 认证初始化继续执行且不产生 Better Auth 密钥强度警告

#### Scenario: 非生产测试密钥
- **WHEN** 开发或测试环境使用短的确定性密钥
- **THEN** 环境校验允许测试流程继续
