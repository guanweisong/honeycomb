## ADDED Requirements

### Requirement: 架构复杂度必须有可追踪预算
工程 MUST 持续记录 feature 文件规模、业务入口数量、跨 feature 依赖、超长文件、第三方依赖和边界违规，并在 PR 中报告新增或减少的复杂度。

#### Scenario: 复杂度回归
- **WHEN** 变更新增未经登记的入口、跨层依赖或超过预算的文件
- **THEN** 质量门禁 MUST 失败并输出具体指标和修复位置

#### Scenario: 复杂度下降
- **WHEN** 删除重复 wrapper、依赖或共享模块
- **THEN** 复杂度报告 MUST 反映删除结果，且相关行为和边界测试 MUST 保持通过

### Requirement: 结构规则必须由自动化测试强制
依赖方向、Server/Client 边界、模型泄漏、权限入口覆盖和未使用依赖检查 MUST 纳入持续集成，而不能只依赖文档审查。

#### Scenario: 本地检查与 CI 一致
- **WHEN** 开发者运行质量检查命令
- **THEN** 本地检查 MUST 覆盖与 CI 相同的架构核心规则，并提供可定位的失败信息
