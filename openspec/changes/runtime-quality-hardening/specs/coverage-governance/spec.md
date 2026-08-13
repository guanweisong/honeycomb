## MODIFIED Requirements

### Requirement: 关键模块使用更高门槛
系统 MUST 为权限、环境变量、脱敏、sitemap、缓存和观测核心要求 statements/lines 90% 及 branches 80%，且主分支上的完整覆盖率命令 MUST 通过这些门槛。

#### Scenario: 权限模块覆盖不足
- **WHEN** capability 授权模块 lines 为 89%
- **THEN** 覆盖率门禁失败，即使全局门槛已满足

#### Scenario: 关键环境模块覆盖不足
- **WHEN** 任一已声明关键环境模块未达到 statements/lines 90% 或 branches 80%
- **THEN** 覆盖率命令以失败状态退出，且修复必须通过补充行为测试完成
