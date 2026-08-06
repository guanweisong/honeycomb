# Coverage Governance Specification

## Purpose

定义生产源码覆盖率统计范围、排除边界和质量门槛。

## Requirements

### Requirement: 覆盖率统计全部生产源码
系统 MUST 显式将 `src` 下生产 TypeScript 和 TSX 文件纳入覆盖率统计。
#### Scenario: 未被测试导入的业务模块
- **WHEN** 一个业务页面或 service 未被任何测试导入
- **THEN** 它以零覆盖进入覆盖率分母

### Requirement: 覆盖率排除项有明确边界
系统 SHALL 仅排除声明、纯类型、生成文件、基础 UI 和由 E2E 覆盖的薄入口，并 MUST NOT 排除业务页面、hooks、services 或安全核心。
#### Scenario: 新增排除项
- **WHEN** 开发者将生产文件加入 coverage exclude
- **THEN** 配置必须给出可审查的类别理由且不属于禁止排除范围

### Requirement: 全局覆盖率门槛阻止回退
系统 MUST 至少要求 statements 70%、lines 70%、functions 65%、branches 60%。
#### Scenario: 分支覆盖率低于门槛
- **WHEN** 完整测试结束且 branches 为 59%
- **THEN** 覆盖率命令以失败状态退出

### Requirement: 关键模块使用更高门槛
系统 MUST 为权限、环境变量、脱敏、sitemap、缓存和观测核心要求 statements/lines 90% 及 branches 80%。
#### Scenario: 权限模块覆盖不足
- **WHEN** capability 授权模块 lines 为 89%
- **THEN** 覆盖率门禁失败，即使全局门槛已满足
