## Context

仓库当前忽略整个 `drizzle/` 目录，本地存在的 14 份迁移未进入 Git，而生产数据库已经包含更多结构变化。直接提交本地历史或从应用 schema 重新生成都会误称一个并不真实的历史，因此必须先把生产结构作为事实源，只读获取并建立新的接管基线。

## Goals / Non-Goals

**Goals:**

- 能从空数据库确定性建立与接管时生产结构一致的 schema。
- 后续每次 schema 变化都有可审查、可排序、可提交的迁移。
- 现有生产库不会误执行初始化 baseline。
- CI 能发现 schema 已改但迁移缺失的情况。

**Non-Goals:**

- 不在本变更中修改业务表结构或迁移生产数据。
- 不恢复已经丢失的历史迁移时间线。
- 不自动执行任何生产写操作。

## Decisions

### 生产结构是接管事实源

使用现有只读数据库凭据执行 Drizzle introspection，输出到隔离的临时目录；随后逐表、索引、外键和约束对比应用 schema。选择生产而不是本地迁移，是因为生产已经领先，本地文件不能证明真实部署历史。

### 放弃未追踪旧迁移并建立单一 baseline

旧 `drizzle/` 产物先形成清单和校验摘要，再删除并从已审查的生产快照生成 baseline。baseline 只初始化新数据库，不重放到现有生产库。现有生产库的迁移 ledger 接管必须形成单独命令和操作说明，并在真正写入前再次获得明确批准。

### 迁移文件成为版本化交付物

`.gitignore` 不再忽略 `drizzle/`；SQL、meta snapshot 和 journal 一同提交。开发者修改 schema 后必须生成迁移，CI 在干净副本中重新生成并比较结果，避免只靠文件时间或人工记忆。

### 部署使用 migrate，push 只用于可丢弃环境

生产和共享环境只运行经过 Git 审查的迁移。`drizzle-kit push` 仅允许本地临时数据库使用，避免部署时出现不可审计的隐式 DDL。

## Risks / Trade-offs

- [生产 introspection 包含本地 schema 没有的对象] → 先生成差异报告，任何代码 schema 对齐都作为显式实现步骤审查。
- [baseline 被误用于现有生产库] → 初始化和接管命令分离，生产接管默认只读，ledger 写入要求人工确认。
- [introspection 丢失 SQLite 特定约束] → 对 `sqlite_master`、索引和外键结果做第二来源校验，并在空库试建后比较。
- [旧迁移删除后无法恢复] → 它们本来未被 Git 追踪；删除前只记录文件名和摘要，不把错误历史纳入正式基线。

## Migration Plan

1. 只读获取生产结构并生成差异报告。
2. 审查生产结构与代码 schema，解决所有不一致。
3. 清理旧本地产物并生成 baseline。
4. 在全新临时数据库执行 baseline，反向 introspect 并比较结构。
5. 提交 baseline、CI 门禁和文档。
6. 部署应用但不对现有生产库运行 baseline。
7. 另行审核并执行一次生产 migration ledger 接管；执行前备份并获得明确批准。

## Open Questions

无。真正的生产 ledger 写入是实施阶段的显式审批点。
