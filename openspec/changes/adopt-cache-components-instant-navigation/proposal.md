## 背景

当前公开博客的动态内容路由需要在参数和未缓存读取完成前提供可复用的页面外壳。Cache Components 与 Partial Prefetching 支持在不预先枚举所有语言、ID 或 slug 的情况下生成外壳。应用还包含绑定请求的后台认证，以及一个必须先适配才能全局启用 Cache Components 的 Serwist 路由处理器。

## 变更内容

- 在整个 App Router 中启用 Next.js Cache Components 和 Partial Prefetching。
- 使用明确的缓存生命周期和标签缓存可复用的公开读取；保留结构化写入失效约定，以及请求时读取的评论、浏览量和认证信息。
- 为博客和后台目标路由添加局部 Suspense 边界，使安全的页面外壳可以立即显示，未缓存的工作随后流式返回。
- 移除根 `[locale]`、文章、页面和列表路由中的 `generateStaticParams()`；语言、ID 和 slug 在请求时解析，页面外壳不依赖构建时枚举参数。
- 将 Serwist 迁移到与打包器无关的 configurator 构建流程，并保留 `/serwist/sw.js` 和离线页面预缓存行为。
- 保留现有 sitemap 数据缓存，并移除不受支持的路由级 `dynamic` 导出。

## 能力

### 新增能力

- `instant-navigation`：所有面向用户的 App Router 路由都提供安全的即时页面外壳；博客站内链接完整预取目标内容，后台链接只预取页面外壳。

### 修改能力

- `nextjs-runtime-performance`：共享公开读取在渲染内去重之外，还使用 Next.js 标签缓存。
- `public-content-freshness`：结构化失效会使对应的 Cache Components 标签过期。
- `admin-content-loading`：后台导航保留已认证的页面外壳，并使用 Partial Prefetching，避免预取私有路由数据。

## 影响范围

变更涉及 `next.config.ts`、公开查询与缓存基础设施、公开路由页面和 Metadata、后台认证边界、sitemap 处理器、Serwist 配置与构建脚本，以及相关测试和规格。保留公开 URL、后台授权、现有数据模型、请求时评论和浏览量追踪，以及离线回退 URL。
