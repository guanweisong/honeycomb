## MODIFIED Requirements

### Requirement: Schema 与迁移同步门禁

系统 MUST 在 CI 中阻止 schema 变更缺少对应迁移，MUST 验证 SQL、Journal 与 Snapshot 双向一一对应，并 MUST 通过隔离数据库重放证明全部迁移的归一化结构与当前 Drizzle schema 一致；受控环境只能执行已提交迁移。

#### Scenario: Schema 变化缺少迁移

- **WHEN** 提交修改数据库 schema 但未产生匹配迁移
- **THEN** CI MUST 失败并指出同步问题

#### Scenario: 迁移工件单向缺失

- **WHEN** SQL、Journal tag 或 Snapshot 任一工件没有对应的另外两项
- **THEN** CI MUST 失败并指出缺失或多余的具体工件

#### Scenario: 迁移重放与当前 schema 漂移

- **WHEN** 在隔离 SQLite 中重放全部版本化迁移后，其表、列、默认值、索引、外键或 CHECK 与当前 Drizzle schema 不一致
- **THEN** CI MUST 失败并输出归一化结构差异

#### Scenario: 生产部署

- **WHEN** 部署流程更新生产数据库
- **THEN** 流程 SHALL 使用版本化 migrate，而不是 `drizzle-kit push`
