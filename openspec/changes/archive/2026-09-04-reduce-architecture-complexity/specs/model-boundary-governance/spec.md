## ADDED Requirements

### Requirement: 持久化模型、领域模型和 View Model 必须隔离
数据库 schema 和 ORM 类型 MUST 仅存在于 infrastructure；领域模型 MUST 不依赖数据库和传输类型；展示代码 MUST 使用 feature-owned View Model 或明确的展示契约。

#### Scenario: 数据库字段变更
- **WHEN** infrastructure 增加或重命名数据库字段
- **THEN** domain 和 UI MUST 不因类型泄漏而被动依赖该字段，只有显式 mapper 或契约变更可以传播影响

#### Scenario: UI 使用传输结果
- **WHEN** 页面需要展示 tRPC 查询结果
- **THEN** 它 MUST 经过 feature 的 View Model 转换，不能把数据库记录或通用 ORM 类型作为组件公共 Props
