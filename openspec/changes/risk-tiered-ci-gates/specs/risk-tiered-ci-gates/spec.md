## ADDED Requirements

### Requirement: 普通变更运行快速且阻塞的 PR 基础门禁

质量工作流 MUST 在每个 PR 上阻塞执行规格校验、类型检查、lint、变更相关测试和生产构建。全量覆盖率、双环境完整 E2E 和 bundle 分析 MUST NOT 成为普通 PR 的必跑任务。生产依赖审计、迁移审查、数据库不变量检查及 process 测试 MUST 保留在常规 PR 门禁。
工作流分类器契约测试 MUST 在每个 PR 上独立于风险分类结果执行，以防分类器改动跳过自身校验。

#### Scenario: 普通 TypeScript 改动

- **WHEN** PR 改动未命中高风险路径且 Vitest 能确定受影响用例
- **THEN** PR 执行规格、类型、lint、相关用例和生产构建，并不启动全量覆盖率或完整 E2E

#### Scenario: 无代码测试目标的改动

- **WHEN** PR 仅改文档或其他无 TS/TSX 测试目标的文件
- **THEN** 规格校验、类型、lint、既有 process/治理检查和生产构建仍阻塞，变更相关测试 lane 可跳过

#### Scenario: 风险分类器或 workflow 改动

- **WHEN** PR 改动风险分类器或质量 workflow
- **THEN** 无条件执行 workflow 契约测试，验证高风险路径与 lane 条件

### Requirement: 高风险改动升级到完整集成与浏览器检查

质量工作流 MUST 将认证/授权、数据库 schema/迁移、feature 服务端写入、媒体存储及 E2E 数据库生命周期相关改动分类为高风险。高风险 PR MUST 阻塞执行完整非覆盖率单元/集成测试和隔离数据库开发 E2E；不得以变更相关测试替代这些检查。

#### Scenario: 认证或数据库高风险改动

- **WHEN** PR 改动认证/授权、数据库/迁移、feature server、媒体/存储或 E2E 生命周期路径
- **THEN** 完整单元/集成测试与开发 E2E 成功后，汇总门禁才成功

#### Scenario: 高风险数据库测试

- **WHEN** 高风险 PR 的完整单元/集成或 E2E lane 执行数据库测试
- **THEN** 每个 lane 使用该次运行独占、可丢弃的本地 `file:` 数据库并执行原有 seed 安全策略

#### Scenario: 生产 E2E 边界变化

- **WHEN** PR 改动 PWA、Playwright 配置、E2E 测试或 E2E 生命周期
- **THEN** 对应的生产 E2E 也必须成功后，汇总门禁才成功

### Requirement: 完整质量保障在夜间和手动门禁中保留

工程 MUST 提供夜间及手动触发的完整保障 workflow，其中全量覆盖率继续执行现有分片与合并阈值，开发和生产完整 E2E 均执行，bundle 分析生成静态报告。各数据库测试 lane MUST 保持独立隔离数据库。

#### Scenario: 夜间完整保障

- **WHEN** 每日计划 workflow 启动
- **THEN** 两个覆盖率 shard、合并覆盖率门禁、开发 E2E、生产 E2E 和 bundle 分析均运行，最终汇总检查要求各 lane 成功

#### Scenario: 手动完整保障

- **WHEN** 维护者手动触发完整保障 workflow
- **THEN** 执行与夜间相同的全量覆盖率、双环境完整 E2E、bundle 分析和汇总门禁

### Requirement: 安全与数据保护门禁不得因 CI 分层而削弱

质量门禁 MUST 保留权限/授权、事务与版本保护、迁移审查、E2E 数据库隔离、seed 安全检查和日志脱敏相关测试及实现；分层只改变检查的触发范围和时机，不得删除这些机制或降低覆盖阈值。

#### Scenario: 调整工作流成本

- **WHEN** 普通 PR 不再运行完整覆盖率或双环境 E2E
- **THEN** 这些检查仍由夜间/手动完整保障执行，高风险改动仍运行完整单元/集成与开发 E2E，现有安全测试和覆盖阈值保持不变
