## ADDED Requirements

### Requirement: DataTable 职责独立
系统 SHALL 将 DataTable 的状态参数转换、行选择、表头、表体、工具栏和分页拆分为职责独立模块，同时 MUST 保持现有公开 props 和泛型调用方式。

#### Scenario: 现有列表使用 DataTable
- **WHEN** 既有管理页面在重构后传入相同 columns、data、selection 和 onChange
- **THEN** 排序、筛选、分页、选择和操作列行为保持不变

#### Scenario: 测试表格状态
- **WHEN** 单元测试改变排序、筛选或分页
- **THEN** 纯状态 hook 生成与现有 API 相同的请求参数并在必要时重置页码和选择

### Requirement: 大型管理页使用 feature 边界
系统 SHALL 将 menu、user、link、media、page edit 和 comment 页面的查询、mutation、列定义、对话框、表单转换和页面组合职责分离。

#### Scenario: 打开管理页面
- **WHEN** 用户进入任一已迁移管理页面
- **THEN** page shell 组合 feature 模块且不直接承载全部请求、表单和对话框实现

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
