# Package Layer Cleanup

## Purpose

保持共享 UI、应用层与基础设施包同传输层及 App Router 隔离，并明确用户展示契约、通知能力和 tRPC 输出类型的归属。

## Requirements

### Requirement: 共享包保持传输层独立

系统 MUST 使 `packages/ui`、`packages/application` 和 `packages/infrastructure` 不依赖 `packages/trpc` 的路由、feature 模块或由其推导的类型。

#### Scenario: 检查共享包导入

- **WHEN** 执行包边界测试
- **THEN** 测试确认共享 UI、应用层与基础设施不存在对 tRPC 或 App Router 的生产代码导入

### Requirement: 共享用户展示契约稳定

系统 SHALL 为共享 UI 提供不依赖 `AppRouter` 的最小用户展示契约。

#### Scenario: 渲染管理员布局用户信息

- **WHEN** 管理员布局和用户下拉组件接收当前用户
- **THEN** 它们仅通过共享用户展示契约渲染，且不导入 tRPC 输出类型

### Requirement: tRPC 输出类型语义明确

系统 MUST 将由 procedure 输出推导的类型集中在 tRPC 传输层的 `api/outputs.ts`，而不是作为领域 entity 或 feature 内类型文件。

#### Scenario: 使用列表输出类型

- **WHEN** 客户端 feature 引用某个 tRPC 列表或详情输出类型
- **THEN** 它从 `trpc/api/outputs.ts` 导入，且类型仍由相同 procedure 输出推导

### Requirement: 通知能力独立于传输 feature

系统 SHALL 将评论邮件发送与邮件模板放入通知能力包，并保持评论创建后的管理员和回复通知规则。

#### Scenario: 创建顶级评论

- **WHEN** 成功创建一条顶级评论
- **THEN** 系统向管理员发送与重构前等价的评论通知邮件

#### Scenario: 回复已有评论

- **WHEN** 成功创建一条具有有效父评论邮箱的回复
- **THEN** 系统向父评论邮箱发送与重构前等价的回复通知邮件
