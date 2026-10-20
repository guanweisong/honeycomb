## Purpose

区分纯业务契约、持久化实现和公开展示结果，在允许 feature server 直接访问数据库的同时防止 ORM 运行时、敏感字段或重复模型进入 UI。

## Requirements

### Requirement: 持久化实现与纯契约必须隔离

数据库表定义 MUST 位于 lib/db/schema，Drizzle 查询与 ORM 类型 MAY 用于 feature server；纯 schema/type/rules 和 UI MUST 不依赖数据库实现。相同语义结果 SHALL 复用唯一模型，不要求无转换职责的 ViewModel 层。

#### Scenario: 数据库字段变更

- **WHEN** 数据库增加或重命名字段
- **THEN** UI 与纯业务契约 MUST 仅通过明确输出或 mapper 受影响，不通过 ORM 类型泄漏被动扩大契约

#### Scenario: UI 使用传输结果

- **WHEN** 页面展示 tRPC 查询结果
- **THEN** 它 SHALL 使用稳定结果类型，不接收数据库连接或 ORM 查询对象；没有实际转换时不添加只改名的模型

#### Scenario: 公开响应去除私有字段

- **WHEN** 服务端返回公开用户或评论结果
- **THEN** 实现 MUST 选择允许的字段，不能用 Omit 或类型别名代替运行时脱敏
