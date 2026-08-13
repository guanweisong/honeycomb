## ADDED Requirements

### Requirement: 生产 API 限流必须可用
系统在生产环境 MUST 使用已完整配置的 Upstash 限流服务处理所有 `/api/` 请求，且 MUST NOT 因缺失配置而静默放行。

#### Scenario: 生产环境缺少 Upstash 配置
- **WHEN** 生产环境收到 API 请求且 Upstash 配置缺失或不完整
- **THEN** 系统返回 503、JSON 错误码及不泄露内部配置的消息

#### Scenario: 配额耗尽
- **WHEN** 已配置的限流器拒绝某个客户端标识
- **THEN** 系统返回 429 及限流响应头

### Requirement: 非生产环境的限流降级必须受限
系统在非生产环境 SHALL 使用内存允许策略以支持本地开发和隔离测试，且该策略 MUST NOT 在生产环境启用。

#### Scenario: 本地开发未配置 Upstash
- **WHEN** 开发环境收到 API 请求且 Upstash 未配置
- **THEN** 请求按内存允许策略继续处理

#### Scenario: Upstash 运行时故障
- **WHEN** 生产限流服务调用抛出异常
- **THEN** 系统返回 503 而不继续处理受保护 API
