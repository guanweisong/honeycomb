# 工作流与前端结构治理

## 要求：OpenSpec 是唯一变更工作流

工程 MUST 使用 OpenSpec 管理需求、设计、规格、任务和归档，不得新增或继续维护 Superpowers SDD/SSD 设计文档作为事实来源。

### 场景：创建前端变更

- **WHEN** 变更涉及需求、架构、多个文件或行为调整
- **THEN** 变更必须在 `openspec/changes` 中拥有 proposal、design 和 tasks，并按 OpenSpec 流程实施

## 要求：OpenSpec 文档使用中文

活动 OpenSpec 的 proposal、design、spec、tasks 和归档说明 MUST 使用中文；代码符号、API、路径、命令和必要技术术语可以保留原文。

### 场景：审查活动变更

- **WHEN** 维护者查看活动 OpenSpec change
- **THEN** 文档标题、说明、任务和验证结果均应使用中文

## 要求：组件目录结构稳定

App Router 业务组件 MUST 使用 `components/大驼峰组件名/index.tsx` 和同目录 `index.test.tsx`；单个组件目录不得包含其他入口形式的 `.tsx` 文件。

### 场景：检查组件目录

- **WHEN** 执行 App 结构测试
- **THEN** 组件位置、目录命名、入口文件和测试文件均通过验证
