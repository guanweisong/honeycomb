## MODIFIED Requirements

### Requirement: 对外多语言契约保持兼容

系统 MUST 保持现有 `{ zh, en }` Feature、tRPC、表单和读取模型契约，翻译行与 ORM 类型不得泄漏到上层。

#### Scenario: 读取实体详情

- **WHEN** feature server 从主表和翻译表读取实体
- **THEN** feature server SHALL 显式组装与迁移前相同形状和可空语义的多语言对象

#### Scenario: 提交现有表单

- **WHEN** 管理后台继续提交现有 `{ zh, en }` 输入
- **THEN** transport 和表单 SHALL 无需了解翻译表即可调用既有业务操作，server 函数负责事务和翻译映射
