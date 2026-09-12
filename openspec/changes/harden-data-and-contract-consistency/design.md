## 背景

当前写入 Use Case 在数据库提交后同步调用公开缓存失效器，后者异常会让 API 返回失败，但数据库已经不可回滚。媒体删除跨越对象存储和数据库，现有存储优先顺序保留了同步重试 key，却无法向调用方区分“完全未执行”和“对象已删、数据库结果待确认”。同时，SQLite 只约束翻译语言和少量唯一键，状态枚举、数值范围、评论目标和 Setting 单例仍依赖上层自律。

工程已有明确约束：使用 SQLite/libSQL、Next.js 缓存与对象存储；不新增 Outbox、Cron、队列或第三方依赖；保持主要 tRPC 输入及成功响应兼容；任何迁移验证必须使用隔离本地数据库，生产迁移需要另行审批和备份。

## 目标 / 非目标

**目标：**

- 让 API 对已经提交的数据库结果给出真实成功语义，同时让缓存降级可重试、可观测。
- 让媒体删除精确表达数据库阶段的不确定结果，并保持同步幂等重试。
- 让数据库拒绝权威枚举之外的值、非法数值、非法评论目标和多条全局设置。
- 让 Setting、Menu、Comment 的运行时 schema、静态类型和端口只有一个权威来源。
- 让 CI 能发现跨 Feature 内部导入以及迁移、Journal、Snapshot、当前 schema 的漂移。

**非目标：**

- 不保证缓存失效或对象清理最终必达。
- 不新增持久任务、后台 worker、外部队列或部署定时器。
- 不自动猜测或修复生产中的非法枚举、多 Setting 等歧义数据。
- 不改变权限模型、公开查询结构或正常写入输入字段。

## 决策

### 数据库提交是写入成功边界

`PublicContentInvalidator.invalidate(plan)` 保持唯一端口，但返回可判别的 `completed | degraded` 结果而不向 Use Case 抛出缓存依赖错误。Infrastructure 对完整计划最多执行两次；重试仍失败时记录低基数指标和脱敏结构化日志，返回 `degraded`。各写入 Use Case 在 Repository 成功后调用一次端口并返回原业务结果；Repository 失败时仍不得调用失效器。

选择有限同步重试而不是 Outbox，是因为当前工程没有可靠消费者；新增无人保证执行的任务表会制造虚假的最终一致性承诺。选择返回结果而不是静默吞错，是为了让测试和观测明确区分正常与降级，即使当前 transport 不扩大原成功响应。

重试以完整计划为单位。文章索引版本提升、tag/path 失效均为幂等或允许额外版本跳跃，因此第一次部分完成后重试不会恢复旧缓存。

### 媒体保留存储优先，并显式返回不确定结果

媒体删除继续先读取 `{id,key}`、再删除对象、最后删除数据库记录。对象删除失败继续抛出可重试错误且数据库不变。对象删除成功后，数据库删除若失败，Use Case 返回 `{ success: false, state: "indeterminate", message }`；完全成功保持 `{ success: true }`。后台 UI 对不确定结果提示刷新列表后重试，不显示普通删除成功。

不改为数据库优先，因为那会在对象删除失败时永久丢失用于重试的 key，并制造不可追踪的存储垃圾；不使用软删除状态机，因为没有后台执行器，且会扩大所有媒体查询和选择器的状态语义。

### 数据库约束从权威目录生成，迁移保持静态可审查

Drizzle schema 使用共享 helper 从领域枚举值生成 CHECK 表达式，避免 TypeScript 源码重复成员清单；生成后的 SQL migration 保留静态字面量作为可审查部署工件。约束覆盖：内容与身份状态/类型、非负 views/media 数值、评论三个目标恰有一个、Setting 单例。

Setting 新增内部 `singletonKey = 1` 列，具备 `CHECK(singleton_key = 1)` 与唯一索引。Repository 查询通过该键且要求至多一条，不再依赖无序首行。

迁移不自动纠正非法数据。迁移脚本在建约束前执行只读前置检查；发现异常时以表、字段、数量报告并中止，不输出敏感业务内容。生产执行仍遵循现有备份和批准流程。

### 写入契约由所属 Application schema 推导

Setting 在 Application 建立后台更新 schema 与内部 nullable patch schema；transport 只重导出后台 schema，Repository 端口引用 patch 推导类型。二者共享字段 schema，但用不同名称保留“表单完整对象”和“内部局部清空”的真实语义。

Menu 的保存 schema 移至 Application，`MenuInput` 从其推导；原 transport 文件只重导出。`MenuItem` 删除开放索引签名。Link/Category 等状态字段直接从 `EnableStatus` 构造 schema，并让 Repository 读模型使用对应领域类型；Infrastructure 在读出数据库值时显式解析。

评论只依赖 `PublicContentInvalidator.invalidate(plan)`，删除局部 `invalidateContent` / `invalidateAll` 端口及 Infrastructure 兼容函数。

### 门禁验证真实边界，而不是有限名称样本

Feature 边界测试按源文件所属 Feature 解析导入，禁止直接进入其他 Feature 的 `application`、`domain`、`infrastructure`、`schemas`、`transport`、`admin`、`presentation` 内部目录；`features/contracts` 和显式 `public` 出口保持允许。唯一事实源测试加入 Setting、Menu、Comment 端口身份检查和开放索引签名检查。

迁移门禁执行双向对应检查：每个 Journal tag 有 SQL 和 Snapshot，每个 SQL/Snapshot 都有 Journal；索引连续且 tag 对应。随后在隔离 SQLite 中重放全部迁移，并把归一化结构与当前 Drizzle schema 的新建数据库比较，覆盖表、列、默认值、索引、外键与 CHECK。

## 风险 / 取舍

- [缓存重试仍可能全部失败] → 返回降级结果给 Application、记录指标与脱敏日志；接受无后台执行器时不能保证最终必达。
- [完整计划重试可能多次提升缓存版本] → 版本只要求单调变化，额外跳跃不会造成错误。
- [新增 CHECK 使既有非法数据无法迁移] → 先运行只读预检并中止，不自动选择修复值。
- [Setting 单例迁移遇到多条记录] → 中止并要求操作者明确选择保留记录，禁止按物理顺序自动删除。
- [更严格 Feature 门禁暴露历史越界] → 逐项通过公开契约收敛，不增加宽泛白名单。
- [媒体数据库异常被转换为不确定结果] → 只转换对象删除已经成功后的数据库阶段异常；对象删除失败和目标查询失败保持原错误。

## 迁移计划

1. 先增加失败测试，覆盖缓存提交边界、媒体不确定结果、数据库非法写入、契约身份和门禁盲区。
2. 收敛 Application schema、评论缓存端口和枚举读写类型，不改变数据库。
3. 实现缓存有限重试与降级观测，更新所有 Use Case 行为测试。
4. 调整媒体删除结果和后台反馈。
5. 更新 Drizzle schema，生成迁移与 Snapshot，并增加只读数据预检。
6. 加强迁移重放、Feature 和唯一事实源门禁。
7. 在隔离临时数据库运行迁移与完整测试，随后运行类型、Lint、覆盖率、生产构建和 diff 检查。

部署时先对目标数据库执行只读预检；若无异常，按既有流程创建并验证备份，再在维护窗口应用版本化迁移。回滚应用代码不会移除数据库约束；若必须回滚 schema，只能使用单独审查的前向迁移，不执行即兴逆向 DDL。

## 待决问题

无。低复杂度降级策略、媒体存储优先顺序、数据库严格约束和不自动清洗生产数据均已确认。
