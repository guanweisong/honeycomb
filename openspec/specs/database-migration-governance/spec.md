## Purpose

规范以生产数据库结构为事实源的迁移基线接管、空库可重建性和持续同步门禁，确保既有生产环境不会误重放初始化 DDL，后续变更均可审查和追踪。

## Requirements

### Requirement: 生产结构只读接管

系统 MUST 以当前生产数据库结构作为新迁移基线的事实源，并在建立基线前只读生成可审查的结构差异。

#### Scenario: 获取生产结构

- **WHEN** 执行基线接管流程
- **THEN** 流程只读获取表、列、索引、外键和约束，且不会修改生产 schema 或数据

#### Scenario: 发现结构差异

- **WHEN** 生产结构与代码 schema 不一致
- **THEN** 流程 MUST 输出差异并阻止基线完成，直到差异被明确处理

### Requirement: 可重建的版本化基线

系统 SHALL 将初始化 baseline、Drizzle 元数据和 journal 纳入版本控制，并能够在空数据库重建已审查的目标结构。

#### Scenario: 初始化空数据库

- **WHEN** 在空数据库执行版本化 baseline
- **THEN** 生成结构 SHALL 与已审查的生产基线等价

#### Scenario: 接管现有生产库

- **WHEN** 为现有生产库登记 baseline
- **THEN** 系统 MUST 不重放初始化 DDL，且任何 ledger 写入前 MUST 要求单独明确批准

### Requirement: Schema 与迁移同步门禁

系统 MUST 在 CI 中阻止 schema 变更缺少对应迁移，且受控环境只能执行已提交迁移。

#### Scenario: Schema 变化缺少迁移

- **WHEN** 提交修改数据库 schema 但未产生匹配迁移
- **THEN** CI MUST 失败并指出同步问题

#### Scenario: 生产部署

- **WHEN** 部署流程更新生产数据库
- **THEN** 流程 SHALL 使用版本化 migrate，而不是 `drizzle-kit push`
