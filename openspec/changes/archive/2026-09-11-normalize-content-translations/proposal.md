## Why

分类、文章、页面、标签和网站设置当前把多语言内容序列化为主表中的 JSON 文本，导致数据库无法约束语言、无法为翻译建立真实关系，并让搜索、局部更新与脏数据处理依赖隐式解析行为。将翻译规范化为实体专属关系表，可以在保持现有 API 与表单契约的同时，消除 JSON 多语言列和重复持久化约定。

## What Changes

- 为分类、文章、页面、标签和网站设置分别建立实体专属翻译表，以实体外键与语言组成复合主键。
- 将现有 15 个 JSON 多语言列完整迁移到翻译表，并从主表删除这些列及 `i18nField` 自定义类型。
- 保持 Application、tRPC、管理后台表单和公开读取模型的 `{ zh, en }` 契约不变，由各 Feature Repository 显式拆分和组装翻译行。
- 使用事务协调主记录与翻译记录的创建和更新，并通过级联外键清理翻译。
- 将多语言搜索改为翻译表上的存在性查询，保持分页记录和总数稳定。
- 修正网站设置局部语言更新会覆盖或丢失另一语言的隐式 JSON 行为，改为按语言合并更新。
- 新增带脏数据前置校验的数据迁移、可丢弃数据库迁移验证，以及远程数据库备份、验证、迁移和同步步骤。
- **BREAKING**：数据库物理结构不再包含主表 JSON 多语言列；任何绕过 Repository 直接读取这些列的外部消费者必须改用翻译表。

## Capabilities

### New Capabilities

- `normalized-content-translations`: 定义实体翻译表、稳定多语言契约、读写事务、搜索语义和历史数据迁移要求。

### Modified Capabilities

- `database-migration-governance`: 增加本次远程结构变更必须先创建并验证可恢复备份、再应用已审查版本化迁移的发布要求。

## Impact

- 数据库：`category`、`post`、`page`、`tag`、`setting` 主表，五张新增翻译表，Drizzle schema、relations、迁移 SQL 和 migration ledger。
- 服务端：上述五个 Feature 的 Repository、查询映射、搜索条件、写入事务、内容清洗和媒体关系提取。
- 契约：对外 DTO 形状保持不变；Infrastructure ORM 记录类型和内部映射发生变化。
- 测试：Repository、迁移、关系完整性、单一事实源和架构边界测试；本次明确不运行 E2E。
- 运行环境：目标远程 Turso/libSQL 数据库需要在维护窗口内完成备份验证、迁移和迁移后审计；禁止使用 `drizzle-kit push` 同步生产结构。
