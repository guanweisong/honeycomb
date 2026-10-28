## MODIFIED Requirements

### Requirement: 共享技术与组件保持运行时独立

共享技术与组件 MUST 遵守[依赖方向权威矩阵](../package-layer-architecture/spec.md#requirement-技术依赖不加载业务运行时)，不在本规范另列一套认证或类型例外。

#### Scenario: 检查共享依赖

- **WHEN** 执行架构边界测试
- **THEN** 测试 MUST 拒绝除已列明会话技术集成外导致业务 server、router 或页面进入技术库与通用 UI 的生产依赖链
