## MODIFIED Requirements

### Requirement: 客户端权限状态不能替代服务端授权

客户端组件 MAY 展示权限相关 UI，但服务端 MUST 在执行业务 server 操作前完成最终授权。

#### Scenario: 恶意绕过客户端按钮

- **WHEN** 客户端隐藏按钮后仍构造请求调用受保护操作
- **THEN** 服务端 MUST 拒绝未授权请求，且不得依赖客户端状态
