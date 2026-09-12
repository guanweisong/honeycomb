## 为什么

当前工程已经具备较完整的分层、类型与迁移治理，但数据库提交后的缓存失败仍会被误报为写入失败，媒体跨存储删除存在不确定窗口，并且若干关键业务不变量只由 transport 校验而未由数据库兜底。需要一次性收敛成功边界、持久化约束和跨层契约，避免“类型上不可能、数据库中却允许”以及同一语义多源维护。

## 变更内容

- 将数据库提交定义为内容写入的业务成功边界；缓存失效采用有限重试和结构化失败记录，不再覆盖已经提交的写入结果。
- 为媒体删除增加明确的 `indeterminate` 结果，保留当前存储优先、幂等重试语义，同时避免向调用方伪装为普通失败。
- 通过版本化迁移补充状态枚举、非负数、评论唯一目标和全局设置单例约束，并在迁移前审计、处理不符合约束的既有数据。
- 将 Setting 更新运行时 schema 移入 Application 并由其推导静态类型；显式区分后台更新命令和内部可空 Patch。
- 统一评论缓存失效到 `PublicContentInvalidator.invalidate(plan)`，删除 `invalidateContent`、`invalidateAll` 兼容入口。
- 移除菜单 Application 读模型的开放索引签名，收紧枚举和读取模型类型。
- 扩大 Feature 边界、唯一事实源和迁移一致性门禁，使检查覆盖全部内部目录并验证迁移重放结构。
- 保持现有 tRPC 输入和成功响应兼容；媒体删除新增可判别结果属于有意的响应语义增强。

## 能力

### 新增能力

- `persistence-integrity`: 定义数据库必须执行的业务不变量、设置单例和既有数据迁移安全要求。

### 修改能力

- `side-effect-consistency`: 调整数据库提交后的缓存失败与媒体删除不确定结果语义。
- `public-content-freshness`: 将同步缓存失效失败从写入失败改为有限重试后的可观测降级。
- `type-safety-governance`: 收敛 Setting、Comment、Menu 契约并扩大唯一事实源门禁。
- `database-migration-governance`: 增加迁移与 Journal/Snapshot 双向对应及重放结构一致性验证。
- `feature-business-boundaries`: 扩大跨 Feature 内部导入检查的目录覆盖范围。

## 影响

- 数据库：新增一份 Drizzle schema 变更、迁移 SQL 与 snapshot；生产迁移前需要只读数据审计和备份门禁。
- Application：内容写入的缓存失败处理、媒体删除结果、Setting 写入契约和评论失效端口发生调整。
- Infrastructure：新增缓存失效重试/观测适配，补充数据库约束和迁移重放比较。
- Transport/UI：保持主要写入成功响应不变；媒体删除调用方需要处理 `deleted` 与 `indeterminate` 两种结果。
- 测试与 CI：新增约束探针、迁移重放、失败注入、类型归属和跨模块边界门禁；不新增外部队列、Cron、Outbox 或运行时依赖。
