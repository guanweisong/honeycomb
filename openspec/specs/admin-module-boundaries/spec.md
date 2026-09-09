# Admin Module Boundaries Specification

## Purpose

定义管理后台大型页面、DataTable 和 feature 辅助代码的职责边界，并在重构过程中保持外部行为、接口和操作流程不变。

## Requirements

### Requirement: DataTable 职责独立
系统 SHALL 将 DataTable 的状态参数转换、行选择、表头、表体、工具栏和分页拆分为职责独立模块，同时 MUST 保持现有公开 props 和泛型调用方式。
#### Scenario: 现有列表使用 DataTable
- **WHEN** 既有管理页面在重构后传入相同 columns、data、selection 和 onChange
- **THEN** 排序、筛选、分页、选择和操作列行为保持不变
#### Scenario: 测试表格状态
- **WHEN** 单元测试改变排序、筛选或分页
- **THEN** 纯状态 hook 生成与现有 API 相同的请求参数并在必要时重置页码和选择

### Requirement: 大型管理页使用 feature 边界
系统 SHALL 将 menu、user、link、media、page edit、comment、tag 和 post category 页面的查询、mutation、列定义、对话框、表单转换和页面组合职责分离。管理后台 feature 的共享辅助代码目录 MUST 使用 `lib` 或 `constants` 这类正确且一致的命名。
#### Scenario: 打开管理页面
- **WHEN** 用户进入任一已迁移管理页面
- **THEN** page shell 组合 feature 模块且不直接承载全部请求、表单和对话框实现

#### Scenario: 引用后台辅助代码

- **WHEN** 管理后台 feature 引用本区域的帮助函数或常量
- **THEN** 导入路径使用一致、正确的 `lib` 或 `constants` 目录名

### Requirement: 管理页重构保持外部行为
系统 MUST 保持现有 URL、tRPC 输入输出、权限结果、视觉文案和用户操作流程。
#### Scenario: 执行现有 CRUD 流程
- **WHEN** Playwright 执行列表、创建、编辑、删除或上传场景
- **THEN** 用户可见行为和服务端调用契约与重构前一致

### Requirement: 共享抽象来自稳定重复
系统 MUST 将页面特有类型和逻辑保留在 feature 内，仅当至少两个模块存在稳定相同行为时才提取新的共享抽象。
#### Scenario: 单页专用对话框
- **WHEN** 一个对话框仅由 menu 页面使用
- **THEN** 它保留在 menu feature 内而不进入全局 UI 包

### Requirement: CI 必须执行完整且确定性的 Chromium E2E 库存

质量工作流 MUST 在显式隔离的本地数据库迁移并播种最小确定性数据后运行完整 Chromium Playwright 项目，MUST NOT 通过点名 spec 文件缩小既有测试库存。关键场景 MUST NOT 因缺少运行时内容而条件跳过。

#### Scenario: 新增 E2E spec 自动进入质量门禁

- **WHEN** 开发者在 E2E 目录新增由 Chromium 项目匹配的 spec
- **THEN** CI 的完整项目命令 MUST 自动执行该文件，无需修改工作流文件列表

#### Scenario: 空白 CI 数据库获得确定性场景数据

- **WHEN** 质量工作流创建新的本地 SQLite/libSQL 数据库
- **THEN** 系统 MUST 在启动浏览器测试前创建可登录后台账号以及主题、菜单、文章、页面、分类和标签所需的最小数据

#### Scenario: 阻止种子脚本写入远程数据库

- **WHEN** 种子脚本收到非本地 `file:` 数据库 URL或缺少显式 E2E 开关
- **THEN** 脚本 MUST 在任何写入前终止

#### Scenario: 确定性浏览器契约不可跳过

- **WHEN** 主题切换或标签导航所需的数据意外缺失
- **THEN** E2E MUST 失败并暴露夹具回归，而不是调用条件跳过
