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

### Requirement: 规范化翻译迁移需要已验证远程备份

系统 MUST 在对远程数据库执行规范化翻译迁移前创建可恢复导出，并验证导出的完整性、关键数据计数和内容校验值。

#### Scenario: 创建远程迁移备份

- **WHEN** 准备对目标 Turso/libSQL 数据库应用规范化翻译迁移
- **THEN** 流程 MUST 在仓库外私有目录导出 snapshot 与 WAL，限制文件权限，并记录 SHA-256 与关键表行数

#### Scenario: 备份验证失败

- **WHEN** 导出缺失、SQLite 完整性检查失败或关键表计数无法核对
- **THEN** 流程 MUST 停止且不得对远程数据库执行任何迁移写入

#### Scenario: 应用远程迁移

- **WHEN** 备份验证通过且进入已批准维护窗口
- **THEN** 流程 SHALL 只执行已提交的版本化 migrate，并在完成后验证 ledger、schema、记录计数和翻译关系完整性

#### Scenario: 远程迁移失败

- **WHEN** 版本化迁移或迁移后审计失败
- **THEN** 流程 MUST 停止发布、保留日志与备份，并按既有 runbook 恢复，不得即兴执行逆向 DDL
