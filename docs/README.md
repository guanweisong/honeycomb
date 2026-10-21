# 文档导航

## 当前架构与开发入口

- [代码阅读地图](code-reading-map.md)：从实际业务入口追踪调用。
- [架构与依赖边界](architecture-dependency-report.md)：当前职责、运行时边界和不可变行为。
- [简单 Feature 迁移说明](ddd-migration-guide.md)：旧文件名保留链接兼容，正文是当前迁移方法。
- [权限矩阵](permission-matrix.md)：capability 与角色规则。
- [减法版历史实施与验收](reduced-architecture-results.md)：当时范围和验证证据；顶部标明后续媒体方案与冻结提交 CI。
- [全仓审查实施账本](full-audit-implementation-ledger.json)与[实施计划](superpowers/plans/2026-10-21-full-audit-implementation.md)：74项结论的逐项处理状态。
- [逐文件复审建议实施](skill-reaudit-implementation.md)与[51项处置账本](skill-reaudit-implementation-ledger.json)：本轮验证、边界和待测项。
- [测试指南](../tests/README.md)：architecture、tooling、integration 分组、相邻业务测试和 E2E 命令。
- [OpenSpec 规范](../openspec/specs/)与[当前目录归属变更](../openspec/changes/refine-directory-ownership/proposal.md)：现行行为规范及本轮范围、设计和任务。

## 运维与治理

- [数据库迁移](database-migration-runbook.md)、[媒体存储](media-storage-runbook.md)、[Sentry 日志](sentry-logging.md)。
- [公开缓存与离线验收](public-cache-verification.md)：缓存链路、配置值、失效恢复与未验证环境边界。
- [依赖审计例外](dependency-audit-exceptions.md)与[审计库存](dependency-audit-inventory.json)：治理规则与记录；按记录日期判断适用性，不沿用旧验证结论。

## 历史计划与报告

以下记录保留当时路径、检查点和执行结果，不作为今天的目录要求或新一轮通过证据：

- [简单 Feature 迁移结果](simple-feature-architecture-results.md)与[2026-10-20 实施计划](superpowers/plans/2026-10-20-simple-feature-architecture.md)：顶部补记 PR #13 合并与后续 CI，正文历史不重写。
- [复杂度审计](architecture-complexity-audit.md)、[复杂度基线](architecture-complexity-baseline.md)、[生产 schema 基线](production-schema-baseline-report.md)。
- [2026-09-11 评论边界验证](superpowers/reports/2026-09-11-comment-boundary-verification.md)：原 task-2 报告，保留当时验证证据。
- [历史实施计划](superpowers/plans/)与[历史设计](superpowers/specs/)：理解决策背景；当前改动回到上面的架构入口及 OpenSpec。
