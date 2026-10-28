## MODIFIED Requirements

### Requirement: 模块依赖方向必须可自动验证

模块的直接及间接依赖 MUST 按[依赖方向权威矩阵](../package-layer-architecture/spec.md#requirement-技术依赖不加载业务运行时)自动验证；以下场景分别保护纯契约隔离与实际 server 直接数据库访问。

#### Scenario: 纯规则引入运行时依赖

- **WHEN** 纯规则或纯契约通过直接或间接导入加载数据库、UI 或框架 server
- **THEN** 架构测试 MUST 失败并指出违规路径

#### Scenario: 服务端操作直接查询数据库

- **WHEN** feature server 函数直接使用 lib/db 和 Drizzle 执行业务操作
- **THEN** 架构门禁 SHALL 允许该调用，不要求通过仅转发参数的中间层
