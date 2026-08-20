## ADDED Requirements

### Requirement: 模块内部必须遵循领域分层
每个业务模块 MUST 将领域行为放在 `domain`，外部持久化放在 `infrastructure`，传输入口放在 `transport`；普通模块的用例编排放在 `application`，Post、Comment、User 等核心模块的轻量用例编排放在模块根部 service/command/query 文件。

#### Scenario: 用例层不直接访问数据库
- **WHEN** 静态边界测试扫描模块 application 或核心模块根部用例文件
- **THEN** 不得发现 Drizzle、数据库连接或 schema 导入

### Requirement: 模块只能通过公开契约跨模块交互
业务模块 MUST 通过 `public`、`contracts` 或显式模块接口访问其他模块，不得导入其他模块的内部 domain、application 或 infrastructure 文件。

#### Scenario: 发现跨模块内部导入
- **WHEN** 依赖边界测试扫描模块导入
- **THEN** 测试 MUST 失败并报告双方模块路径
