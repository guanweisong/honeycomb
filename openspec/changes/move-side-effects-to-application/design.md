## 背景

当前各 Feature 的数据库写入已经由 Application Use Case 承载，但分类、评论、菜单、页面、文章、设置、标签和用户 Router 会在 Use Case 返回后调用 `invalidatePublicContent` 或 `invalidateAllPublicContent`。因此一次业务操作的完成语义依赖特定传输入口，其他入口复用写入用例时可能遗漏缓存失效。

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

在 `src/packages/application/public-content-invalidator.ts` 定义 `PublicContentReferenceSchema`、由它推导的 `PublicContentReference`，以及只表达 `invalidateContent` 与 `invalidateAll` 两种稳定业务需求的 `PublicContentInvalidator`。现有 Infrastructure 中的同义 Schema 移入该 Application 契约，适配器和各 Feature 共同引用这一唯一事实源，不在各 Feature 复制字段清单。

选择共享端口是因为至少八个 Feature 存在真实消费者，语义一致且不依赖 UI、transport、ORM。各 Use Case 通过 `Pick` 选择所需最小能力；`src/packages/infrastructure/refresh-path.ts` 提供 Next.js `revalidatePath` 适配器。

备选方案一是在每个 Feature 重复定义失效端口，隔离更强但会产生相同契约和测试样板。备选方案二是发布领域事件并统一监听，扩展性更高，但当前没有异步投递、重试或多个消费者需求，会恢复已经清理的死抽象。因此采用共享最小端口。

### 副作用顺序属于写入 Use Case

写入 Use Case 先执行 Repository 操作，成功后再执行缓存失效，并在全部步骤成功后返回原有结果。Repository 失败时不得调用失效器；失效器失败时保持现有请求失败行为，不回滚已完成的数据库写入，也不静默吞错。

批量文章和页面删除继续失效每个受影响详情路径；分类、菜单、设置、标签、用户和评论审核继续失效全部公开内容。评论创建根据已验证输入的目标选择文章或页面详情失效；自定义目标不新增当前不存在的缓存路径。

### 外部服务只在 Router 组装，不在 Router 编排

Router 可以创建或导入 Infrastructure adapter，并把它作为参数传给 Use Case，但不得直接调用其业务副作用方法。评论验证码、通知与失败日志，以及媒体对象存储继续采用这一模式；本次审计只收敛端口名称、类型归属和边界测试，不改变其已正确位于 Application 的顺序。

缓存适配器也遵循同一规则：Router 注入 `publicContentInvalidator`，Application 决定何时、以何种目标调用。

### 通过行为和静态门禁共同治理

先增加失败测试，证明当前 Router 仍直接编排缓存、Use Case 尚未执行缓存。迁移后，Application 测试验证写入成功、写入失败、缓存失败和批量目标；Router 测试只验证正确依赖被注入。静态门禁扫描 Router，禁止直接调用或导入旧的缓存函数，并确认有公开内容影响的写入 Use Case 使用缓存端口。

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
