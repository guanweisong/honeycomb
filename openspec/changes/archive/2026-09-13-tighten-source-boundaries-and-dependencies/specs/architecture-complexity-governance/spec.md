## ADDED Requirements

### Requirement: 测试专用契约必须位于测试目录

仅被测试导入的权限矩阵、测试类型和测试 schema 适配 MUST 位于 `tests`，不得作为生产源码保存在 `src`。架构门禁 MUST 阻止本次确认的 test-only 模块重新出现。

#### Scenario: 权限矩阵只服务于测试

- **WHEN** 权限 UI 检查矩阵只被测试读取
- **THEN** 矩阵数据及其专用类型 MUST 位于 `tests`，并继续覆盖真实路由和组件。

#### Scenario: 测试专用 schema 适配回归

- **WHEN** tRPC schema 包装没有生产消费者且只被测试引用
- **THEN** 该包装 MUST NOT 保留在 `src`，测试 MUST 直接验证所属模块的权威 schema。

### Requirement: Application schema 消费者必须引用权威定义

Feature 内部消费者 MUST 直接引用所属 Application 的权威写入 schema；仅重新导出同一 schema 的中间文件 MUST NOT 保留。实际定义不同查询或输入规则的 schema 文件 MAY 保留在其现有模块中。

#### Scenario: Feature 消费者使用写入 schema

- **WHEN** Feature 路由、组件或测试需要其写入 schema
- **THEN** 消费者 MUST 从所属 Feature 的 `application/write-schema` 导入，且不得依赖纯转发的 `schemas` 文件。

#### Scenario: 语义不同的模型同名

- **WHEN** 不同边界存在字段或用途不同的同名模型
- **THEN** 清理 MUST 保留各自的契约，不得仅为减少名称重复而合并。
