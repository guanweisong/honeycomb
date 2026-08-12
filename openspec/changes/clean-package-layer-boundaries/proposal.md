## Why

上一轮边界重构已消除了 `auth`、`db` 与 App Router 的主要反向依赖，但共享 UI 仍依赖 tRPC 的全局路由类型，评论邮件通知仍被放在 tRPC 工具目录并反向引用评论展示组件。这些隐式依赖使 UI、传输层和基础设施难以独立演进。

## What Changes

- 为用户展示信息建立与 tRPC 路由无关的共享契约，移除共享 UI 对 `AppRouter` 推导类型的依赖。
- 将评论邮件发送和模板整理为独立通知能力，评论 service 仅负责触发通知。
- 明确 tRPC procedure 输出类型的命名与位置，避免将传输输出误称为领域实体。
- 统一遗留 `libs`、`constans` 命名，并删除已废弃账户安全 HTTP 路由留下的空目录。
- 扩展自动化边界检查，防止共享 UI 和通知能力重新依赖 tRPC feature 或 App Router。

## Capabilities

### New Capabilities

- `package-layer-cleanup`: 定义共享 UI、通知能力与 tRPC 传输层之间的稳定目录及依赖边界。

### Modified Capabilities

- `module-boundaries`: 明确评论通知从 tRPC 工具层抽离后的职责边界，保持现有邮件通知行为。
- `admin-module-boundaries`: 统一管理后台 feature 辅助代码目录命名。

## Impact

- 影响 `src/packages/ui`、`src/packages/notifications`、`src/packages/trpc/api`、评论模块与管理后台辅助模块。
- 不修改公开 URL、tRPC procedure 名称、数据库结构或邮件通知触发规则。
