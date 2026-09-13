## MODIFIED Requirements

### Requirement: 架构复杂度必须有可追踪预算

工程 MUST 持续记录 feature 文件规模、业务入口数量、跨 feature 依赖、超长文件、第三方依赖和边界违规，并在 PR 中报告新增或减少的复杂度。已确认没有生产消费者的兼容出口、空壳 barrel 和历史类型声明 MUST 被删除，并由门禁阻止重新引入。

#### Scenario: 复杂度回归

- **WHEN** 变更新增未经登记的入口、跨层依赖、已淘汰的死出口或超过预算的文件
- **THEN** 质量门禁 MUST 失败并输出具体指标和修复位置

#### Scenario: 复杂度下降

- **WHEN** 删除重复 wrapper、依赖、导出或共享模块
- **THEN** 复杂度报告 MUST 反映删除结果，且相关行为和边界测试 MUST 保持通过

#### Scenario: 框架约定入口

- **WHEN** 静态未使用扫描发现 Next.js、next-intl、Serwist、CSS 或测试夹具入口没有普通 TypeScript 入边
- **THEN** 门禁 MUST 根据显式配置识别这些入口，不得将其作为死代码自动删除
