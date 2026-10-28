# 共享技术与组件边界

## Purpose

保持通用 UI、数据库、认证和其他技术能力独立于应用组合，明确用户展示契约、评论通知和 tRPC 输出类型的归属，避免重建中央转发层。

## Requirements

### Requirement: 共享技术与组件保持运行时独立

共享技术与组件 MUST 遵守[依赖方向权威矩阵](../package-layer-architecture/spec.md#requirement-技术依赖不加载业务运行时)，不在本规范另列一套认证或类型例外。

#### Scenario: 检查共享依赖

- **WHEN** 执行架构边界测试
- **THEN** 测试 MUST 拒绝除已列明会话技术集成外导致业务 server、router 或页面进入技术库与通用 UI 的生产依赖链

### Requirement: 共享用户展示契约稳定

系统 SHALL 复用 user feature 拥有、不依赖 AppRouter 的最小用户展示契约，不复制相同字段集合。

#### Scenario: 渲染管理员布局用户信息

- **WHEN** 管理员布局或用户下拉组件接收当前用户
- **THEN** 它们 SHALL 使用明确用户展示契约，且不得引入数据库或服务端认证运行时

### Requirement: tRPC 输出类型语义明确

客户端 MAY 从根 AppRouter 通过 type-only 关系推导真实传输结果，但 MUST NOT 将根 router 运行时带入客户端，或另建集中 outputs/contracts 转发层。已有同语义 feature 模型 SHALL 直接复用。

#### Scenario: 使用列表输出类型

- **WHEN** 客户端需要列表或详情的结果类型
- **THEN** 它 SHALL 使用所属 feature 稳定模型或真实 procedure 的 type-only 推导，不复制字段、不导入 server 实现

### Requirement: 通知能力归属评论业务

评论邮件模板与通知策略 SHALL 归属 comment feature，并与 tRPC 核心和评论展示组件隔离；成功提交后的通知失败 MUST NOT 改变数据库成功结果。

#### Scenario: 创建顶级评论

- **WHEN** 顶级评论成功创建
- **THEN** 系统 SHALL 保持既有管理员通知内容与触发规则

#### Scenario: 回复已有评论

- **WHEN** 回复存在有效父评论邮箱
- **THEN** 系统 SHALL 保持既有回复通知规则，并在失败时记录脱敏错误
