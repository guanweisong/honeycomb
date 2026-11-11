## Context

博客 `Link` 已开启完整预取，但文章与页面详情在父组件读取数据前调用 `connection()`，分类列表则在请求时读取菜单、设置和文章卡片，因此菜单链接预取只能生成外壳。详情 tRPC 结果同时包含正文、作者、媒体和文章标签；写入后必须让这些已缓存关联同步失效。tRPC context 的 requestId 只用于日志关联，缓存填充使用固定内部上下文并关闭请求观测，不把随机 ID 放进博客内容或缓存键。

## Goals / Non-Goals

**Goals:**

- 让文章与页面详情的正文进入 Next 链接预取结果。
- 正文缓存填充不依赖真实请求 ID；评论、推荐和友情链接仍使用请求时数据。
- 内容写入按 ID 失效；作者、分类、标签和媒体等关联写入按受影响的详情类型失效。
- 只使用 Next 本地 `use cache`，保持列表 Upstash 缓存和 sitemap 专属缓存。
- 菜单指向的分类列表在点击前预取列表卡片数据，并在菜单、分类或文章索引变化后立即失效。

**Non-Goals:**

- 不缓存评论、推荐、友情链接、后台数据或会话。
- 不改数据库、tRPC 外部输入/输出或浏览量上报。
- 不改普通请求的 requestId 生成和观测行为。

## Decisions

1. **缓存路由自身的公开详情 caller。** 文章页和页面页分别在本地 async 函数中使用 `use cache`、明确的 `cacheLife` 与按 ID 标签；不重建集中查询层，也不使用 `use cache: remote`。共享失效键只放在缓存键目录。
2. **正文缓存填充使用显式内部上下文。** 缓存函数通过 `createServerClient({ requestContext: { requestId: "public-detail-cache-fill" }, skipRequestObservability: true })` 调用只读公开详情。这个固定 ID 不进入 tRPC 请求观测；正常动态组件继续由请求时边界生成真实 ID。
3. **把真正动态的附属内容放到子组件。** 移除文章/页面内容父组件上的 `connection()`。评论加载、文章推荐和友情链接列表各在自己的 Suspense 子树内等待 `connection()`，不让它们阻塞缓存详情及正文。评论表单由即时客户端容器渲染，异步评论列表作为其子树；回复交互通过容器内 context 共享，不再让评论查询延后表单。
4. **按数据所有者失效详情。** 结构化计划增加 `refreshPostDetails` 与 `refreshPageDetails`，用于全局关联变化；`contents` 继续按 ID 精确失效。分类、标签写入使文章详情范围失效；作者和媒体写入使文章与页面详情范围失效。设置、菜单、友链写入不触碰正文详情标签。
5. **保持失效顺序。** 先刷新文章索引及 sitemap，再失效详情标签，最后失效详情路径和布局。保留有限重试、降级反馈和已提交写入不回滚语义。
6. **使用标准方式交接 Blog 列表首屏数据。** 服务端以 `QueryClient` 和稳定的 `posts` 查询 key 写入首屏无限列表，再通过 TanStack Query `dehydrate` / `HydrationBoundary` 交接。新 RSC 数据按 `dataUpdatedAt` 与已有客户端缓存合并；不在 query key 中附加每请求 UUID。
7. **缓存菜单目标的列表 URL 数据。** 列表路由本地用 `use cache`、`hours` 生命周期和 `public.blog-lists` 标签缓存列表条件、设置和首屏文章卡片。TanStack hydration state 与其时间戳也在该缓存范围内生成，避免预渲染阶段调用不稳定的 `Date.now()`。缓存填充使用固定 requestId 并关闭请求观测；`post.index` 无论来自 HTTP 还是 Server Component caller 都通过现有 Upstash 列表缓存。`refreshPostIndex` 或 `refreshLayout` 失效 `public.blog-lists`，确保内容、分类、菜单和站点设置写入更新列表结果。

## Risks / Trade-offs

- 预取结果可能在浏览器路由缓存的短生命周期内保留旧快照 → 为详情缓存指定 5 分钟客户端 stale、1 小时 server revalidate、1 天 expire；写入时仍立即失效 server tags 与路径。
- 分类、标签、作者或媒体变化会清空该类型的全部详情缓存 → 这些关联写入频率低，且当前查询没有可靠的反向内容 ID 清单；两个类型标签比额外的全表反查更简单。
- 缓存填充时不记录 tRPC 请求级指标 → 数据库查询指标保留；普通请求的 requestId 和 tRPC 观测不变。
- 列表 Next 缓存与 Upstash 索引缓存叠加 → 由同一 `refreshPostIndex` 失效计划同步刷新；菜单或站点设置变化则通过 `refreshLayout` 失效列表标签。

## Migration Plan

1. 先扩展缓存失效契约和适配器，并为详情标签及关联范围补测试。
2. 修改关联写入的结构化计划，再迁移文章和页面路由的缓存/动态边界。
3. 运行定向测试、类型检查、lint、生产构建；在生产模式 Chrome Network 中确认文章/页面链接预取 RSC 含正文，菜单分类链接预取 RSC 含首屏卡片，点击后内容正常呈现。若仍有动态 RSC 补充请求，确认 metadata 与页面正文复用同一详情缓存 caller。
4. 若构建或预取失败，回退路由级缓存函数并恢复父级 `connection()`；缓存失效扩展可以保留或随路由实现一起回退。

## Open Questions

无。
