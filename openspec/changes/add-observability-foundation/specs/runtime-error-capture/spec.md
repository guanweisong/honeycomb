## ADDED Requirements

### Requirement: tRPC 未处理错误统一捕获
系统 MUST 在 tRPC 边界记录未处理错误、请求关联信息和安全的 procedure 元数据，并保持既有 tRPC 错误响应契约。

#### Scenario: Router 抛出未知异常
- **WHEN** procedure 抛出非预期异常
- **THEN** 系统记录结构化错误并向客户端返回既有安全错误格式

### Requirement: Next.js 服务端错误统一捕获
系统 SHALL 通过 instrumentation 错误入口捕获服务端渲染和 Route Handler 错误。

#### Scenario: 服务端渲染失败
- **WHEN** Server Component 渲染抛出未处理错误
- **THEN** 错误入口记录路由、request ID 和安全错误结构

### Requirement: 观测 adapter 故障不影响业务
系统 MUST 隔离日志和指标 adapter 故障，且 MUST NOT 递归调用同一故障 adapter 报错。

#### Scenario: Metrics adapter 抛出异常
- **WHEN** 业务请求成功但 Metrics adapter 写入失败
- **THEN** 业务请求仍返回原结果且不会形成递归错误
