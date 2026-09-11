## Context

Honeycomb 目前在 `category`、`post`、`page`、`tag` 和 `setting` 主表的 15 个文本列中保存 JSON 多语言对象，并通过 `i18nField` 在 ORM 边界序列化和解析。该结构无法用外键表达翻译归属，无法在数据库层限制语言，局部更新会整列覆盖，跨语言搜索依赖序列化文本模糊匹配；解析失败还会被折叠为 `null`，隐藏历史数据问题。

现有 Application、tRPC、管理后台和公开页面都使用 `{ zh, en }` 读取/写入模型。该形状是稳定应用契约，本次只替换持久化模型，不把翻译行或 ORM 类型泄漏到上层。项目使用 Turso/libSQL、Drizzle 版本化迁移，并要求生产写入前具有已验证备份和明确批准。用户明确要求本次不运行 E2E。

## Goals / Non-Goals

**Goals:**

- 用五张实体专属翻译表替代全部 JSON 多语言列，并删除 `i18nField`。
- 通过真实外键、复合主键和语言约束保护关系完整性。
- 保持现有 `{ zh, en }` API、表单和读取模型兼容。
- 让创建、更新、搜索、分页、删除、内容清洗和媒体关系在规范化结构上具有明确、可测试的语义。
- 无损迁移现有远程数据；先导出并验证可恢复备份，再在维护窗口执行版本化迁移和迁移后审计。

**Non-Goals:**

- 不新增第三种语言，不改变前台路由 locale、文案文件或语言切换交互。
- 不把 API 改成单语言字符串，也不向客户端暴露翻译表。
- 不建立通用多态翻译表、通用 Translation Repository 或新的共享 facade。
- 不运行 E2E；验证限于单元测试、使用隔离临时数据库的迁移/Repository 测试、静态门禁和生产构建。
- 不使用 `drizzle-kit push` 修改远程数据库。

## Decisions

### 使用实体专属翻译表

新增以下表：

| 表 | 复合主键 | 翻译字段 |
| --- | --- | --- |
| `category_translation` | `(category_id, locale)` | `title`、`description`，非空 |
| `post_translation` | `(post_id, locale)` | `title`、`content`、`excerpt`、`gallery_location`、`quote_author`、`quote_content`，可空 |
| `page_translation` | `(page_id, locale)` | `title`、`content`，非空 |
| `tag_translation` | `(tag_id, locale)` | `name`，非空 |
| `setting_translation` | `(setting_id, locale)` | `site_name`、`site_sub_name`、`site_signature`、`site_copyright`，可空 |

每个实体 ID 都建立指向主表的外键并使用 `ON DELETE CASCADE`。`locale` 使用数据库 `CHECK (locale IN ('zh', 'en'))`；复合主键同时保证一个实体每种语言最多一行。分类、页面和标签的 Application 创建契约要求完整双语，因此对应翻译字段非空。文章本来允许字段和单种语言缺失；网站设置明确允许按语言局部更新，因此两者保持可空语义。

选择实体专属表而不是一张 `(entity_type, entity_id, field, locale, value)` 通用表，是为了保留真实外键、字段类型、非空约束和可发现查询。没有采用文章/页面混合表，因为多态归属不能获得相同的数据库完整性，节省的表数量也不足以抵消复杂度。

### 对外多语言契约保持唯一且不变

`src/packages/domain/localization/i18n.ts` 继续拥有支持语言和 `{ zh, en }` 运行时契约。Application DTO 与读取模型继续引用该权威定义；不得为翻译行再复制一套上层 DTO。Infrastructure 增加实体内聚的纯映射函数，将多行按 locale 组装为现有对象，并将命令对象拆成批量写入值。

ORM 翻译行是持久化模型，不作为 Repository 输出。迁移结束后删除 `src/packages/infrastructure/db/i18n-field.ts` 及其所有引用。迁移 SQL 中固定的 `zh`、`en` 是不可变历史快照，不成为运行时第二事实源。

### 写入在一个数据库事务中完成

创建操作在同一事务中写入主行和翻译行；更新操作在同一事务中更新主行、按提供的 locale upsert 翻译，并在需要时更新主记录时间。分类、页面和标签的完整 DTO 总是写两行。文章只为至少包含一个非空翻译字段的 locale 保留行；显式清空某语言的最后一个字段时删除空翻译行，使“无翻译”具有单一表示。

网站设置局部更新只修改 DTO 中实际提供的字段和 locale，不覆盖未提供语言。显式 `null` 清空可空字段；当某 locale 的四个字段均为空时删除该行。数据库约束错误映射为现有 Application 错误边界，不把 SQL 错误暴露给 transport。

### 读取采用批量加载和显式组装

列表和详情先读取主实体，再使用本批实体 ID 一次加载对应翻译行，并通过映射函数组装稳定读取模型。文章关联的分类、标签以及页面/文章正文媒体关系沿用批量关系加载，但关系查询必须同时取得相应翻译行，禁止逐实体或逐语言查询。

多语言筛选使用翻译表上的相关 `EXISTS` 条件。主分页查询不直接 join 翻译表，从而保证每个实体只计数一次，`limit`、`offset` 和总数不因两种语言而膨胀。排序继续只允许现有主表字段；本次不新增按翻译文本排序。

### 迁移以失败保护和无损回填为先

版本化迁移按以下顺序执行：

1. 使用临时 guard 和触发器校验旧值是有效 JSON；分类、页面和标签还必须具备非空 `zh`、`en` 必填值。错误信息包含可执行的只读诊断 SQL，禁止静默修复。
2. 创建五张翻译表及约束。
3. 对 `zh`、`en` 分别使用 `json_extract` 回填。文章和网站设置只保存真实存在的值；不得复制另一语言、写入占位文本或制造翻译。
4. 重建五张主表以删除 15 个旧列，并恢复全部既有索引和外键。
5. 验证主记录数量未变化、必填翻译齐全、无孤儿翻译、旧列消失，再让迁移提交。

迁移先在 `mktemp -d` 创建的独占本地 `file:` 数据库上执行，安装清理 trap，并在结束后确认数据库、WAL/SHM 和临时目录全部删除。禁止复用开发数据库或远程数据库做测试。

### 远程发布先备份后迁移

远程目标只从项目现有 `TURSO_URL` 解析并在执行前打印脱敏后的数据库身份。正式写入前进入维护窗口，使用 `turso db export` 将 snapshot 与 WAL 导出到 `/Users/guanweisong/Documents/backups/honeycomb/<UTC 时间戳>/`；目录权限为 `0700`，文件权限为 `0600`，不得提交到 Git。

备份必须通过 SQLite `PRAGMA integrity_check`、关键表行数清单和 SHA-256 校验，并保留导出元数据。任何检查失败都停止发布。随后只运行已提交且已在临时数据库验证的 `bun run db:migrate`，不得使用 push。迁移完成后读取 migration ledger，执行只读 schema 审计和关键数据计数/孤儿检查。若迁移失败或审计不一致，停止应用发布并保留日志与备份；不在生产库即兴执行逆向 DDL，恢复按既有 runbook 使用已验证导出完成。

## Risks / Trade-offs

- [列表读取增加一次翻译查询] → 对实体 ID 批量查询并用 Map 组装，避免 N+1；分页主查询不 join 翻译表。
- [SQLite 重建主表期间外键复杂] → 由 Drizzle 生成基础迁移后人工审查约束和重建顺序，并在真实 baseline 副本上执行完整迁移测试。
- [历史 JSON 含无效或缺失必填翻译] → 前置 guard 失败并给出诊断 SQL；未经用户决定不伪造内容。
- [应用版本与数据库结构短暂不兼容] → 在维护窗口内先停写、迁移数据库、执行审计，再部署只读取翻译表的新版本。
- [远程备份包含敏感业务数据] → 保存到仓库外的私有目录，限制权限，不在命令输出打印内容或凭据，并向用户报告精确位置与校验值。
- [不运行 E2E 留下浏览器流程风险] → 保留现有 API/表单契约，运行完整单元与 Repository/迁移测试及生产构建，并在交付中明确 E2E 未验证。

## Migration Plan

1. 先以测试驱动方式实现 schema、映射、Repository 和迁移，在独占临时数据库验证从生产 baseline 到目标结构。
2. 运行类型检查、Lint、完整单元测试、迁移治理、OpenSpec 严格校验、生产构建和 `git diff --check`；不运行 E2E。
3. 只读审计远程 schema、migration ledger 和待迁移数据，确认与已验证输入一致。
4. 创建远程数据库导出并完成完整性、计数和 SHA-256 验证，记录备份位置。
5. 在维护窗口执行 `bun run db:migrate`，随后验证 ledger、目标 schema、记录计数、必填翻译和孤儿关系。
6. 同步部署使用新 schema 的应用版本并执行不写数据的健康检查。
7. 任何远程阶段失败都停止后续步骤、保留日志和备份，并依据数据库迁移 runbook 恢复；未经新授权不扩大数据修复范围。

## Open Questions

无。支持语言、API 兼容、缺失值语义、备份位置、迁移方式和验证范围均已确定。
