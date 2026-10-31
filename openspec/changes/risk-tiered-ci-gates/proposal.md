## Why

当前每个 PR 都运行全量覆盖率、完整开发与生产 E2E、bundle 分析，普通改动也承担了高风险改动和发布验证的耗时。最近 15 个使用当前工作流的 PR 中，工作流耗时 P50/P90 为 4.7/15 分钟，job 耗时合计 P50/P90 为 16.3/25.5 分钟；覆盖率和开发 E2E 合计占 P50/P90 的 11.2/21 job 分钟。按变更风险安排检查可以改善日常反馈，同时继续拦截权限、持久化和部署回归。

## What Changes

- 普通 PR 保留规格校验、类型检查、lint、变更相关测试和生产构建。
- 认证/授权、数据库与迁移、feature 服务端写入、媒体存储等敏感路径触发完整单元/集成测试及隔离数据库开发 E2E。
- 将全量覆盖率、完整开发与生产 E2E、bundle 分析移到夜间或手动完整保障工作流。
- 保持 coverage 阈值、E2E 数据库隔离和现有安全/数据保护测试不变。

## Capabilities

### New Capabilities

- `risk-tiered-ci-gates`: 定义 PR 按变更风险分层执行检查，并在夜间/手动流程运行完整保障。

### Modified Capabilities

无。

## Impact

影响 `.github/workflows/quality.yml`、新增完整保障 workflow、变更风险分类脚本、质量 workflow 契约测试及对应 OpenSpec 规格。应用 API、数据库 schema、依赖和安全策略不变。
