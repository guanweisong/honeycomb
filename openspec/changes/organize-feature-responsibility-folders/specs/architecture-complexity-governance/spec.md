## MODIFIED Requirements

### Requirement: Feature 写入 schema 消费者必须引用权威定义

Feature 内部消费者 MUST 直接引用所属 Feature 的权威写入 schema；仅重新导出同一 schema 的中间文件 MUST NOT 保留。实际定义不同查询或输入规则的 schema 文件 MAY 保留在其现有模块中。

#### Scenario: Feature 消费者使用写入 schema

- **WHEN** Feature 路由、组件或测试需要其写入 schema
- **THEN** 消费者 MUST 从所属 Feature 的 `schemas/` 中具体权威定义文件 导入，且不得依赖纯转发的中间文件

#### Scenario: 语义不同的模型同名

- **WHEN** 不同边界存在字段或用途不同的同名模型
- **THEN** 清理 MUST 保留各自的契约，不得仅为减少名称重复而合并
