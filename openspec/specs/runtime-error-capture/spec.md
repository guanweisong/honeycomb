# Runtime Error Capture Specification

## Purpose

定义 tRPC 与 Next.js 服务端错误的统一捕获、安全记录、请求关联和故障隔离行为，确保未知异常可被诊断，同时不改变既有响应契约或向客户端泄露内部信息。

## Requirements

### Requirement: tRPC 未处理错误统一捕获

系统 MUST 在 tRPC 边界记录未处理错误、请求关联信息和安全的 procedure 元数据，并保持既有 tRPC 错误响应契约。业务应用错误及领域错误 MUST 由独立且始终执行的 transport 规范化边界处理，不依赖观测开关或 handler 自行 catch；HTTP formatter MUST 继续处理 context 创建失败。

#### Scenario: Router 抛出未知异常

- **WHEN** procedure 抛出非预期异常
- **THEN** 系统记录结构化错误并向客户端返回既有安全错误格式

#### Scenario: 关闭观测后业务错误

- **WHEN** 关闭观测且未添加局部 catch 的 procedure 抛出应用或领域错误
- **THEN** HTTP 与 server caller 仍返回对应安全错误分类，不泄露 SQL 或凭据

#### Scenario: 每次调用只记录最终失败

- **WHEN** 启用观测且 procedure 返回或抛出失败结果
- **THEN** 观测取得规范化后的结果并只记录一次最终 requestFailed，独立 authorizationDenied 审计事件保留

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

### Requirement: 认证 SDK 只记录白名单诊断

系统 MUST 为 Better Auth 使用专用安全 logger，保留诊断级别、固定操作和已审核的有限错误分类。系统 MUST NOT 输出 SDK 自由文本消息、SQL、参数、堆栈、任意错误属性或原始 cause；未知错误 MUST 保留通用诊断而不是关闭日志。日志故障 MUST NOT 改变认证或数据库异常语义。

#### Scenario: 会话查询错误包含敏感绑定

- **WHEN** SDK 记录包含合成会话 token、SQL 参数或嵌套 cause 的错误
- **THEN** 输出仅含允许的诊断字段，任何原始消息、绑定或 cause 内容都不出现，原业务错误继续传播

#### Scenario: 参数未知或日志输出失败

- **WHEN** SDK 参数包含未知字段、循环 cause、抛错属性或日志 sink 故障
- **THEN** 日志入口不会抛错影响认证，且不会回退到原始 console 输出

### Requirement: 后台认证读取等待真实请求

后台 app 请求所有者 MUST 在运行时预渲染期间阻止会话和用户数据库读取，真实请求到达后才继续；该边界 MUST NOT 被移入通用数据库或身份库。系统 MUST 保留请求内身份去重、未认证结果和未知错误传播。

#### Scenario: 运行时预渲染已具有请求头

- **WHEN** Next 运行时预渲染可以提供 headers 但尚未进入真实请求阶段
- **THEN** 后台认证入口等待请求，预渲染完成或取消时没有启动会话与用户查询

#### Scenario: 真实请求读取身份

- **WHEN** 真实请求进入后台认证入口
- **THEN** 当前请求头正常交给身份读取，已登录、匿名与未知失败的语义保持不变
