## ADDED Requirements

### Requirement: 全局 API 限流必须有界且故障隔离
Proxy 中的全局 API 限流 MUST 使用确定的等待上限；超时或供应商故障 MUST 按环境定义的安全策略结束请求并记录可观测结果，不得无限等待或抛出未处理异常。

#### Scenario: 生产环境限流服务超时
- **WHEN** 限流供应商在等待上限内没有响应
- **THEN** Proxy 返回 503、记录限流不可用结果且不继续执行目标 API

#### Scenario: 开发环境未配置限流服务
- **WHEN** 本地开发没有配置远程限流凭据
- **THEN** 请求使用明确的本地允许策略继续，且不伪装成远程限流成功

### Requirement: 高成本 procedure 可组合独立限流
tRPC SHALL 提供不复制鉴权和业务规则的可组合限流边界，使验证码、登录相关或高成本 procedure 能声明独立策略。

#### Scenario: 高成本 procedure 达到独立限额
- **WHEN** 调用者达到该 procedure 声明的限额
- **THEN** procedure 在业务 handler 执行前返回可识别的限流错误
