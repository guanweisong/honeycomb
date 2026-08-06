## ADDED Requirements

### Requirement: DataTable 内部模块可独立验证
系统 SHALL 为 DataTable 状态、参数归一化和行选择逻辑提供可直接测试的接口，并通过组合组件验证渲染行为。

#### Scenario: 运行 DataTable 回归测试
- **WHEN** 执行 DataTable 单元及交互测试
- **THEN** 分页、排序、筛选、空状态、错误状态和选择行为均保持既有契约

### Requirement: 管理页面职责隔离
系统 SHALL 让大型管理页面的 page shell、数据查询、写操作、列定义、对话框和表单转换可独立理解和修改。

#### Scenario: 修改页面列定义
- **WHEN** 开发者仅调整 user 列表的列呈现
- **THEN** 无需修改 user 查询、mutation 或对话框控制模块

#### Scenario: 修改表单转换
- **WHEN** 开发者调整 page edit 的 DTO 到表单值转换
- **THEN** 纯转换测试可以在不渲染完整页面的情况下验证行为
