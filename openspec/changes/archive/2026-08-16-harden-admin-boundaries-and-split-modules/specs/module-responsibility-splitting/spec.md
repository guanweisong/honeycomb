## ADDED Requirements

### Requirement: 拆分必须保持外部行为

大型页面、权限矩阵和复杂组件 MUST 只按明确职责拆分，拆分后不得改变既有导出、权限结果、路由、UI 行为和数据模型。

#### Scenario: 权限矩阵执行结果不变

- **WHEN** 对现有 procedure 矩阵执行授权测试
- **THEN** 每个 procedure 的 permission、allowed roles、输入和 first boundary 与拆分前一致

#### Scenario: 模块拆分后入口稳定

- **WHEN** 现有模块从原入口被导入
- **THEN** 原导出仍可用，且相关单元测试和类型检查通过

### Requirement: 大文件拆分按职责治理

新增模块 MUST 分别承载数据定义、查询/转换、行为逻辑或视图渲染，不得仅为降低行数制造无意义包装文件。

#### Scenario: 纯逻辑可独立测试

- **WHEN** 从页面抽取标题、转换或结构化数据逻辑
- **THEN** 新模块可以在不渲染页面的情况下被独立测试
