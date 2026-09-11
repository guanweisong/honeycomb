## 背景

当前各 Feature 的数据库写入已经由 Application Use Case 承载，但分类、评论、菜单、页面、文章、设置、标签和用户 Router 会在 Use Case 返回后调用 `invalidatePublicContent` 或 `invalidateAllPublicContent`。因此一次业务操作的完成语义依赖特定传输入口，其他入口复用写入用例时可能遗漏缓存失效。迁移后的补充消费者审计发现，友情链接同样在公开页面中读取，但其写入尚未接入缓存端口，因此纳入同一边界。

评论创建已经把验证码和通知作为依赖注入 Application，媒体删除也已经在 Application 中协调对象存储和数据库顺序；这些路径应保留现有语义，并纳入统一的静态边界检查。API 限流、会话解析、入口 capability 鉴权和 tRPC 错误映射仍属于传输边界。

## 目标 / 非目标

**目标：**

- 让每个写入 Use Case 自己保证与业务结果相关的缓存和外部服务副作用。
- 让 Application 只依赖稳定端口，不导入 Next.js、S3、Resend、Turnstile 或其他 Infrastructure 实现。
- 保持数据库成功后才执行缓存失效，并保持当前缓存失败会使请求失败的同步语义。
- 通过行为测试验证调用顺序、失败短路和返回值，通过静态测试禁止 Router 重新编排副作用。
- 保持现有公开 API、权限、数据库结构和部署依赖不变。

**非目标：**

- 不引入领域事件、消息队列、Outbox、后台重试或最终一致性框架。
- 不改变评论通知的尽力发送语义，也不改变媒体删除的同步幂等重试语义。
- 不把 API 限流、会话、入口鉴权或错误协议迁入 Application。
- 不建立统一的万能副作用服务或让各 Feature 互相依赖内部实现。

## 决策

### 使用跨 Feature 的最小缓存端口

在 `src/packages/application/public-content-invalidator.ts` 定义 `PublicContentReferenceSchema`、由它推导的 `PublicContentReference`、结构化的 `PublicCacheInvalidationPlan`，以及只表达单次 `invalidate(plan)` 的 `PublicContentInvalidator`。计划可声明详情引用、公开布局、文章索引和 sitemap 四种影响范围；现有 Infrastructure 中的同义 Schema 移入该 Application 契约，适配器和各 Feature 共同引用这一唯一事实源，不在各 Feature 复制字段清单。

选择共享端口是因为至少九个 Feature 存在真实消费者，语义一致且不依赖 UI、transport、ORM。各 Use Case 通过 `Pick` 选择唯一失效能力；`src/packages/infrastructure/refresh-path.ts` 对详情引用去重，并按计划至多执行一次公开布局刷新、Upstash 文章索引版本提升和 sitemap tag 立即过期。

备选方案一是在每个 Feature 重复定义失效端口，隔离更强但会产生相同契约和测试样板。备选方案二是发布领域事件并统一监听，扩展性更高，但当前没有异步投递、重试或多个消费者需求，会恢复已经清理的死抽象。因此采用共享最小端口。

### 副作用顺序属于写入 Use Case

写入 Use Case 先执行 Repository 操作，成功后再执行缓存失效，并在全部步骤成功后返回原有结果。Repository 失败时不得调用失效器；失效器失败时保持现有请求失败行为，不回滚已完成的数据库写入，也不静默吞错。

批量文章和页面删除通过一次计划失效所有受影响详情路径及一次公开布局，避免按 ID 重复刷新。文章写入同时失效文章索引和 sitemap，页面写入同时失效 sitemap，菜单与分类写入失效 sitemap；分类、标签、用户和媒体删除同时失效保存其关联快照的文章索引。评论创建根据已验证输入的目标选择文章或页面详情失效；自定义目标不新增当前不存在的缓存路径。

### 多层缓存由同一适配器协调

公开读取存在 Next.js 路由缓存、Upstash 文章索引缓存和 `unstable_cache` sitemap 缓存。Application 只声明业务影响范围，不导入这些实现。Infrastructure 使用共享缓存标识提升文章索引版本，并通过 `revalidateTag(tag, { expire: 0 })` 使带相同 tag 的 sitemap shard 与 shard-count 在下一次读取时阻塞刷新；sitemap 原有 300 秒 TTL 作为兜底保留。一次计划同时影响多层缓存时，适配器先提升 Upstash 文章索引版本，再失效 sitemap tag，最后失效详情和布局路由，保证路由重新生成时只会观察到已更新的内层缓存版本。

失效计划只允许声明值为 `true` 的范围，并且必须至少包含一个非空详情引用或一个启用范围，防止调用方把空计划误当作成功失效。媒体删除在非空 ID 集合已找不到记录时仍执行幂等缓存失效，使“数据库删除成功、缓存失效失败”的重试能够修复公开缓存；空 ID 集合继续直接成功且不执行副作用。

Post Repository 删除版本提升调用，只负责持久化。通用 `CleanZod` 类型从 tRPC 目录迁移到共享 Application 校验边界并删除旧出口，防止 Application 反向依赖 transport。

### 外部服务只在 Router 组装，不在 Router 编排

Router 可以创建或导入 Infrastructure adapter，并把它作为参数传给 Use Case，但不得直接调用其业务副作用方法。评论验证码、通知与失败日志，以及媒体对象存储继续采用这一模式；本次审计只收敛端口名称、类型归属和边界测试，不改变其已正确位于 Application 的顺序。

缓存适配器也遵循同一规则：Router 注入 `publicContentInvalidator`，Application 决定何时、以何种目标调用。

### 通过行为和静态门禁共同治理

先增加失败测试，证明当前 Router 仍直接编排缓存、Use Case 尚未执行缓存。迁移后，Application 测试验证写入成功、写入失败、缓存失败和批量目标；Router 测试只验证正确依赖被注入。静态门禁扫描 Router，禁止直接调用或导入旧的缓存函数，并确认有公开内容影响的写入 Use Case 使用缓存端口。

### 缓存初始化与身份数据采用安全默认值

文章索引版本读取在版本键不存在时使用隐式版本 `1`。Redis `INCR` 对不存在的键同样从 `1` 开始，因此首次失效必须继续推进到 `2`，避免旧的 `v1` 缓存继续命中；并发首次提升允许产生额外版本跳跃，但每次返回的版本都已经离开隐式默认值。

公开文章作者读取模型只保留页面消费的 `id` 与 `name`。Zod 对旧缓存对象执行解析时会剥离额外字段，因此无需清空全部历史缓存即可立即停止披露账户邮箱、权限级别、状态和内部时间戳。数据库关联查询也同步缩小列选择，避免不必要数据进入进程。

Better Auth 的通用 `/update-user` 会形成绕过 `Permission.userManage` 与 Application 缓存失效的竞争写入口，因此在身份配置中禁用。后台用户编辑继续使用现有 tRPC User Use Case；登录、安全设置和会话管理端点不受影响。

### 评论业务规则与请求元数据必须穿过真实边界

Comment Application 使用 `CommentRequestMetadata` 接收已经规范化的 `ip` 与 `userAgent`，不得接收或向 Repository 传递 HTTP `Headers`。Router 负责从当前请求头提取这两个值；Application 依次执行验证码校验、目标状态读取与业务判断、父评论目标读取与同源判断、评论持久化、尽力通知和缓存失效。

目标 Repository 只返回页面或文章的原始状态以及父评论保存的目标引用，不再抛出承载业务含义的 Infrastructure 错误。Application 根据 `PUBLISHED`、评论开关和同源目标规则抛出统一 `ApplicationError`，因此任意适配器或新入口都获得相同不变量。

公开评论 DTO 的权威映射位于 Application，并从 `CommentRecord` 推导输入子集；Infrastructure 先把数据库记录转换为 `CommentRecord`，再调用公共映射。Application barrel 只导出 Application 用例与契约，通知实现由 Router 从其 adapter 位置直接注入。架构门禁递归解析 Feature 内部相对转出口，防止根目录 facade 隐藏到 Infrastructure 或通知实现的反向依赖。

所有批量删除 transport 使用的共享 Schema 至少要求一个 ID，避免空请求触发数据库无操作和全层缓存失效。Better Auth 安全回归除配置捕获外，还直接调用实际 handler，验证 `/update-user` 在到达会话与数据库逻辑前返回 404。

## 风险 / 权衡

- [大量函数签名同步变化] → 按 Feature 逐个执行 RED/GREEN，并使用类型检查定位全部消费者，不保留兼容重载。
- [缓存失败发生在数据库提交后，调用方可能误以为写入失败] → 本次保持现有外部行为；未来若要改为尽力失效或 Outbox，单独建立规格。
- [共享端口演化成万能服务] → 端口只允许公开内容失效，不接受回调、任意路径或通用事件名称。
- [静态正则门禁产生误报或漏报] → 以行为测试为主，静态测试只检查稳定 import/call 边界。
- [迁移遗漏非 tRPC 消费者] → 使用类型检查和 `rg` 扫描所有 Use Case 消费者、缓存函数调用点及测试 fixture。

## 迁移计划

1. 建立失败的 Application 副作用行为测试和 Router 禁止直接编排副作用的边界测试。
2. 定义共享 Application 缓存端口，并让现有 Next.js 刷新实现提供 Infrastructure adapter。
3. 逐 Feature 将缓存调用迁入写入 Use Case，更新 Router 为纯依赖组装。
4. 审计评论通知、验证码和媒体存储路径，补齐静态边界与行为测试，不改变既有顺序。
5. 删除旧的函数式兼容入口或重复契约，更新架构文档与 OpenSpec。
6. 运行类型、Lint、全量单测、覆盖率、进程测试、构建和 diff 检查。

回滚时可整体恢复 Use Case 签名和 Router 缓存调用；本变更不涉及数据迁移或不可逆状态变化。

## 待决问题

无。缓存失败策略、评论通知策略和媒体删除策略均保持当前规格，不在本次重构中改变。
