# Public Cache Coherence Design

## 背景

公开内容当前同时使用 Next.js 路由缓存、Next.js `unstable_cache` sitemap 缓存和 Upstash 文章索引缓存。现有 `PublicContentInvalidator` 只表达详情路径与公开布局刷新，导致分类、标签、用户和媒体变更无法使内嵌关联快照的文章索引缓存失效；文章 Repository 又自行提升缓存版本，使副作用顺序隐藏在 Infrastructure 中。批量删除还会重复刷新公开布局。

## 目标

- Application 明确表达一次写操作影响的全部公开缓存范围。
- Infrastructure 在一次调用中对详情路径去重，并且最多刷新一次布局、文章索引和 sitemap。
- 文章索引缓存不再由 Post Repository 隐式失效。
- sitemap 在相关写入完成后立即失效，同时保留 300 秒兜底 TTL。
- Application 不再从 tRPC 包导入通用类型。
- 保持现有输入输出、权限、数据库结构以及“写入成功后同步执行失效，失效失败向上传播”的语义。
- 缓存版本键首次创建时也必须离开隐式默认版本，确保第一次失效有效。
- 公开文章作者只披露页面需要的 `id` 与 `name`，并关闭绕过 User Application 的身份资料写入口。

## 方案比较

### 方案 A：统一失效计划（采用）

将共享端口改为单次 `invalidate(plan)` 调用。计划由结构化详情引用和布尔范围组成：公开布局、文章索引、sitemap。各 Use Case 声明真实影响，Infrastructure 负责执行具体技术动作和去重。

优点是调用点显式、批量天然去重、跨 Feature 不依赖 Post Infrastructure，并且可以在单元测试中验证完整影响范围。缺点是现有写入 Use Case 签名和测试需要同步迁移。

### 方案 B：继续增加多个方法

在现有端口增加 `invalidatePostIndex()`、`invalidateSitemap()` 等方法，由 Use Case 逐个调用。改动较小，但批量去重、调用顺序和遗漏风险仍分散在每个 Feature。

### 方案 C：让 `invalidateAll()` 隐式清除所有缓存

适配器每次全站刷新都提升文章版本并清除 sitemap。实现最少，但 Link、Setting、Comment 等无关写入也会清理文章索引，语义不透明，且无法解决详情批量刷新中的重复调用。

## Application 契约

唯一权威契约位于 `src/packages/application/public-content-invalidator.ts`：

```ts
type PublicCacheInvalidationPlan = {
  contents?: readonly PublicContentReference[];
  refreshLayout?: boolean;
  refreshPostIndex?: boolean;
  refreshSitemap?: boolean;
};

interface PublicContentInvalidator {
  invalidate(plan: PublicCacheInvalidationPlan): Promise<void>;
}
```

`PublicContentReferenceSchema` 继续作为详情引用的运行时权威定义。计划只由服务端 Application 构造，不接受客户端提供任意路径或缓存 key。

写操作到失效范围的映射：

| Feature / 操作 | 详情 | 布局 | 文章索引 | sitemap |
| --- | --- | --- | --- | --- |
| Post 创建、更新、删除、标签关联更新 | 受影响文章 | 是 | 是 | 是 |
| Page 创建、更新、删除 | 受影响页面 | 是 | 否 | 是 |
| Menu 保存 | 否 | 是 | 否 | 是 |
| Category 创建、更新、删除 | 否 | 是 | 是 | 是 |
| Tag 创建、更新、删除 | 否 | 是 | 是 | 否 |
| User 创建、更新、删除 | 否 | 是 | 是 | 否 |
| Media 删除 | 否 | 是 | 是 | 否 |
| Link、Setting、Comment 审核/删除 | 按现有语义 | 是 | 否 | 否 |
| Comment 创建 | 对应 Post/Page | 由详情刷新统一包含 | 否 | 否 |

媒体上传只新增未被公开内容引用的元数据，不触发公开缓存失效；媒体删除可能通过外键将文章封面设空，因此触发布局与文章索引失效。

## Infrastructure 实现

`src/packages/infrastructure/refresh-path.ts` 提供统一适配器：

1. 校验计划至少包含一个非空详情引用或一个值为 `true` 的范围，并去重详情引用。
2. `refreshPostIndex` 为真时先提升一次 Upstash `post.index` 版本。
3. `refreshSitemap` 为真时使用 `revalidateTag(tag, { expire: 0 })` 立即使 sitemap shard 与 shard-count 缓存过期。
4. 最后对所有支持语言刷新详情路径，并在 `refreshLayout` 为真时只调用一次 `revalidatePath("/[locale]", "layout")`。

sitemap 的两个 `unstable_cache` 使用同一稳定 tag；300 秒 TTL 保留为异常情况下的兜底。缓存 namespace、版本 key 和 sitemap tag 各只有一个权威定义，不在 Feature 间复制。

版本键缺失时读取端使用隐式版本 `1`，而 Redis `INCR` 对缺失键的首次结果同样是 `1`。因此版本提升遇到首次结果 `1` 时继续原子递增一次到 `2`；并发初始化最多产生无害的额外版本跳跃，不会继续命中旧 `v1` 数据。

公开文章关联查询只选择作者 `id` 与 `name`，共享 Zod 读取模型也只保留这两个字段。旧缓存即使仍带邮箱、权限级别、账户状态和内部时间戳，解码时也会剥离额外字段。Better Auth 通用 `/update-user` 被禁用，后台用户修改继续走具备 `user:manage` capability 的 tRPC Application 入口。

## 数据流与失败语义

```text
Router -> Application Use Case -> Repository write
                               -> invalidator.invalidate(plan)
                                  -> detail/layout
                                  -> post-index version
                                  -> sitemap tag
```

Repository 写入失败时不执行任何失效。失效任一步失败时请求继续失败，不回滚已提交数据库写入，也不吞错；这保持现有对外行为。本次不引入 Outbox、重试队列或最终一致性事件总线。媒体删除使用相同非空 ID 重试且记录已经不存在时，仍执行一次幂等失效，以修复上一次数据库成功但缓存失败留下的陈旧公开缓存；空 ID 请求不产生副作用。

## 类型与依赖边界

`CleanZod` 从 `src/packages/trpc/api/schemas` 移到 `src/packages/application/validation` 所属的共享 Application 校验边界。全部消费者改用新权威出口，旧文件删除，不保留兼容层。

Application 只依赖共享 Application 契约和 Feature Repository 端口。Category、Tag、User、Media 不得导入 Post Infrastructure；Router 只负责注入统一适配器。

Comment Application 只接收 transport 已提取的 `ip/userAgent` 纯元数据。目标 Repository 返回页面/文章状态和父评论目标，公开状态、评论开关及父子同源由 Application 判断；公共评论 DTO 也由 Application 基于 `CommentRecord` 映射。Feature Application 转出口不得直接或间接导出 Infrastructure 与通知 adapter。

共享批量删除 Schema 至少包含一个 ID。Better Auth `/update-user` 除配置检查外，以实际 handler 请求验证返回 404。

## 测试策略

- 先扩充共享适配器测试，证明详情去重、各范围只执行一次、sitemap 立即失效和失败传播。
- 为 Post、Page、Menu、Category、Tag、User、Media、Link、Setting、Comment 的写入 Use Case 增加或调整行为测试，逐项验证失效计划。
- 修改 Post Repository 测试，证明纯持久化实现不再提升缓存版本。
- 增加架构门禁，禁止 Application 导入 tRPC/Infrastructure，并验证写入 Router 只注入适配器。
- 运行聚焦测试、完整单元测试、类型检查、Lint、生产构建、OpenSpec 严格校验和 `git diff --check`。

## 非目标

- 不改变公开页面所依赖的作者契约、管理端交互、数据库 schema 或缓存 TTL；未声明且未被消费的账户内部字段不再随公开响应返回。
- 不为缓存失败增加补偿事务、异步重试或消息队列。
- 不调整浏览量递增的缓存策略。
- 不清理与本次缓存一致性和依赖方向无关的代码。
