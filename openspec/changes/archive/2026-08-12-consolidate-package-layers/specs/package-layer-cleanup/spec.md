## MODIFIED Requirements

### Requirement: 共享包保持传输层独立
系统 MUST 使 `packages/ui`、`packages/application` 和 `packages/infrastructure` 不依赖 `packages/trpc` 的路由、feature 模块或由其推导的类型。

#### Scenario: 检查共享包导入
- **WHEN** 执行包边界测试
- **THEN** 测试确认共享 UI、应用层与基础设施不存在对 tRPC 或 App Router 的生产代码导入
