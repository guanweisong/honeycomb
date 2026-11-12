## Context

文章与页面详情使用动态 ID 路由和 Cache Components。当前公开详情数据已按 ID 缓存，文章正文及推荐也必须进入完整 URL 预取结果。Next.js 在启用 Cache Components 时要求 `generateStaticParams` 至少返回一个参数；参数未列出的动态路径仍可在请求时处理。

## Goals / Non-Goals

**Goals:**

- 构建时为当前已发布文章和独立页面生成 `zh/en` 详情路径。
- 参数列表只读取发布状态和 ID，不在枚举阶段加载正文、媒体或推荐。
- 保留未被构建枚举的 ID 在运行时访问，并保持已有正文预取边界。
- 无已发布内容时仍满足框架的非空参数要求，且不产生可访问内容。

**Non-Goals:**

- 不预生成列表 slug 或将所有语言路由静态化。
- 不改变评论、友情链接和推荐查询的时机、错误处理或预取契约。
- 不增加公开 API、数据库 schema 或内容缓存身份。

## Decisions

1. **复用发布态的轻量查询。** 文章和页面分别复用已有 sitemap ID 投影查询，并按 `MAX_PAGE_SIZE` 分批读取。它们只返回公开且已发布的 ID；数据库访问留在服务端数据 helper，路由文件只导出 `generateStaticParams`。
2. **将已发布 ID 展开到支持语言。** 构建时为每个 ID 生成 `zh` 和 `en` 路径。详情数据仍由原有按 ID 缓存读取，构建参数生成不复制正文数据。
3. **不要求枚举完整。** 未包含在构建参数里的新 ID 保持 Next.js 默认运行时路径处理。`dynamicParams` 在启用 Cache Components 时不可配置，因此不额外导出该选项。
4. **空列表使用无效占位参数。** Cache Components 不接受空的 `generateStaticParams` 数组。无内容时返回一个格式无效的详情 ID，由现有 `assertDetailId` 触发 not-found，避免发明公开内容或调用数据库详情查询。
5. **保留 URL 预取行为。** 生成的路径仍由原详情组件获取正文和推荐；评论与友情链接仍在现有独立 Suspense 边界，不移动请求时副作用或公开缓存身份。

## Risks / Trade-offs

- 每次完整构建需要访问数据库，并为当前发布内容生成页面 → Vercel 需为对应 Production/Preview 环境提供数据库构建变量；本地验证使用独占 fixture。
- 内容量和构建产物随发布文章、页面增长 → 只预生成 ID 查询返回的发布内容，不加载非公开数据；关注生产构建耗时与部署产物。
- 构建后新内容首次访问仍由运行时处理 → 保留该行为作为可用性契约，并通过 URL 预取保护验证正文。

## Migration Plan

1. 添加共享参数分页与语言展开 helper，并在文章、页面详情路由导出生成器。
2. 更新即时导航主规格，明确已发布详情可选择预生成而完整枚举不是运行时正确性的前提。
3. 执行 `verify:pr` 和使用独占本地 fixture 的生产构建；通过 PR CI 验证部署目标构建环境。

## Open Questions

无。
