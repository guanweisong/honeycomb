## Context

当前列表路由在页面组件里用局部 Suspense 包住列表内容。动态 `params`、列表缓存读取和数据库查询完成前，Next.js 会先输出列表骨架。用户要求列表首屏同步出现，同时保留预渲染；首次访问有已发布文章关联的标签和作者 URL 也应直接命中构建产物。

Next.js 16 启用了 Cache Components。公开菜单中的分类 slug 可在构建时枚举，因此 `generateStaticParams()` 为全部支持语言生成分类 URL，`ensureStatic = "navigation"` 要求这些已生成路径在构建时完成静态渲染。标签、作者和构建后新增的分类不要求穷举，仍由同一页面在请求时解析。列表通过现有 `getCachedListPageData()` 读取数据，不改变数据所有权或缓存键。

## Goals / Non-Goals

**Goals:**

- 列表路由不再向浏览器输出 `Loading articles` 骨架。
- 菜单中的分类，以及已发布文章关联的标签和作者列表路径，在构建输出中包含首屏卡片或空状态。
- 未枚举的动态列表请求在返回时包含对应筛选条件的首屏卡片或空状态。
- 保留博客链接完整 URL 预取，并验证分类列表 RSC 预取仍包含卡片。

**Non-Goals:**

- 不优化 Upstash、数据库查询或列表业务规则；同步输出会把现有查询时长计入响应等待。
- 不改变文章详情、独立页面、评论、友情链接或后台路由的渲染策略。
- 不改变公开 URL、查询参数或缓存身份。

## Decisions

1. 列表页面等待 `params` 和 route data 后返回内容；为公开菜单分类及已发布文章实际使用的标签/作者生成静态路径并用 `ensureStatic = "navigation"` 检查构建期完整预渲染。移除列表页专属 Suspense fallback 和骨架导入。
2. 首屏 PostList 直接用路由数据渲染；挂载后再启用 React Query 无限滚动，避免客户端查询 hook 阻断预渲染。
3. 保留 `getCachedListPageData()` 的 Next Cache Components 缓存及共享博客链接的 `prefetch=true` 策略。生产 E2E 必须验证完整 RSC 预取仍有分类首屏卡片。
4. 更新 `instant-navigation` 的预渲染与动态参数要求，明确菜单分类路径构建期预渲染，未枚举列表路径同步请求渲染。
5. 用生产浏览器验证第一次直接刷新 HTML 不包含列表骨架且包含列表卡片，并验证菜单预取后点击能显示列表。
6. 标签和作者路径只从已发布文章的关联关系取 ID；查询只投影 ID，不读取文章正文、用户资料或未关联的空标签。新 ID 和空列表继续走现有运行时解析。

## Risks / Trade-offs

- 分类路径的构建时数据库读取耗时计入构建过程，并通过现有缓存策略控制再验证。
- 每个有公开内容的标签和作者会为全部支持语言增加静态页面，构建和产物数量随当前公开筛选项数量增加。
- 空标签、无公开文章的作者、菜单中尚未出现的分类及构建后新增路径仍按请求解析；这些 URL 没有构建期静态 HTML。
- Next.js 可能将动态 catch-all 路由报告为部分预渲染；以 prerender manifest 中生成路径的 `compute: static`、完整 HTML 大小和生产浏览器结果确认分类路径包含首屏。

## Migration Plan

本地更新规范与实现，运行目标生产 E2E、生产构建并在 Chrome 验证。无需数据库迁移。回滚时恢复列表页局部 Suspense 与原规格。
