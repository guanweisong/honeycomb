## ADDED Requirements

### Requirement: 合并前持续质量验证
系统 MUST 通过 GitHub Actions 在拉取请求和主分支推送时执行类型检查、lint、单元覆盖率、生产构建和依赖审计。

#### Scenario: 拉取请求引入质量回退
- **WHEN** 任一必需检查以非零状态退出
- **THEN** 对应工作流失败并阻止受保护分支合并

#### Scenario: 依赖锁文件发生变化
- **WHEN** 拉取请求修改依赖或锁文件
- **THEN** 工作流使用 Bun 锁文件的冻结安装并执行 `bun audit`

### Requirement: CI 执行关键端到端回归
系统 SHALL 在 CI 的 Chromium 环境执行安全响应头、RBAC 与 PWA 离线关键 E2E 场景。

#### Scenario: 生产构建启动测试服务器
- **WHEN** CI 执行关键 E2E
- **THEN** Playwright 使用生产构建启动应用并在失败时保留 trace
