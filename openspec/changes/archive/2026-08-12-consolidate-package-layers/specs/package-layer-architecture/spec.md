## ADDED Requirements

### Requirement: packages 顶层采用六层架构
系统 MUST 将业务代码包组织为 `domain`、`identity`、`application`、`infrastructure`、`trpc` 和 `ui` 六个顶层层级。

#### Scenario: 检查 packages 顶层目录
- **WHEN** 执行包架构边界测试
- **THEN** 测试确认不存在旧的 `auth`、`account-security`、`db`、`http`、`notifications`、`observability` 或 `security` 顶层包

### Requirement: 领域概念独立于传输层
系统 MUST 在 domain 中定义用户、内容、导航、国际化和通用状态的稳定业务概念，且 domain 不依赖其他 packages。

#### Scenario: 引用文章状态
- **WHEN** 数据库、tRPC 或 UI 需要文章状态、类型或显示选项
- **THEN** 它们从 domain content 模块导入相同契约，而不从 tRPC feature 类型模块导入

### Requirement: 层级依赖方向受约束
系统 MUST 保持 UI 独立于 tRPC 和 App Router，基础设施独立于 tRPC 和 App Router，且 identity 与 application 不依赖 tRPC。

#### Scenario: 执行依赖边界测试
- **WHEN** 新增或修改 packages 内生产代码
- **THEN** 自动化测试拒绝违反既定层级方向的 import
