## MODIFIED Requirements

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
