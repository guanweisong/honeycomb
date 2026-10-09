## 背景

Honeycomb 使用 Next.js 16.4.0，采用本地化 App Router，根布局为 `src/app/(blog)/[locale]/layout.tsx`。文章、页面和列表路由目前导出空的 `generateStaticParams()` 函数。公开查询使用 React `cache()` 在单次渲染内去重，文章列表结果还使用现有的版本化 Upstash 缓存。写入已经通过 `publicContentInvalidator` 生成结构化失效计划。后台布局和模板会读取 `headers()` 来认证和授权。Serwist 目前通过 `@serwist/turbopack` 路由处理器提供生成文件；其已安装实现明确不支持 Cache Components。

## 目标与非目标

**目标：**

- 为每个 App Router 路由启用 Cache Components 和 Partial Prefetching。
- 在公开博客和后台页面间导航时，立即显示安全的页面外壳；依赖请求数据、路由参数或未缓存查询的工作随后流式返回。
- 让可见的站内链接使用 Next.js App Shell 预取。后台链接继续使用 `auto` 行为，避免逐个链接完整预取认证后才可见的数据。
- 只缓存可复用的公开读取，并使用现有结构化失效计划可以清除的缓存标签。
- 移除 locale、ID 和 slug 的 `generateStaticParams()`，让这些参数在请求时解析并复用静态页面外壳。
- 保留后台访问检查、公开 URL、sitemap 行为、浏览量追踪、评论时效性和离线支持。

**非目标：**

- 重构本地化公开 URL 或根 `[locale]` 路由段。
- 在服务端缓存会话、用户专属数据、后台数据或评论数据。
- 修改数据库 schema、公开 API 合约或业务写入流程。
- 在 Next.js 16.4 仍支持 `unstable_cache` 时，迁移独立的 sitemap 缓存。

## 决策

1. **全局启用两项框架能力。** 设置顶层 `cacheComponents: true` 和 `partialPrefetching: true`，保留 `experimental.agentUpgrade`、`experimental.staleTimes` 及其他无关配置。启用 Partial Prefetching 后，可见 `<Link>` 默认预取目标 App Shell。后台链接继续使用现有的 `auto` 策略；只有验证证明公开目标需要在点击前载入 URL 专属内容时，才为相应链接显式设置预取。

2. **缓存公开查询结果，不缓存请求上下文或私有内容。** 将稳定的公开读取改为 `use cache: remote`，并使用 `cacheLife('max')` 和显式标签。`getPublicComments()` 继续只在单次渲染内复用，不跨请求缓存。公开缓存填充使用稳定的内部请求上下文，避免在缓存作用域内通过 `crypto.randomUUID()` 生成请求 ID。现有 Upstash 文章列表缓存继续供 tRPC 消费者使用，并由现有失效计划递增版本。

3. **将现有失效计划映射到缓存标签。** 为共享布局数据、文章索引、sitemap 和单篇文章/页面详情定义权威标签。`refreshPostIndex` 递增现有 Upstash 版本并使 Next.js 文章索引标签过期；`contents` 使匹配的详情标签过期并重新验证对应语言路径；`refreshLayout` 使共享布局标签过期并重新验证语言布局；`refreshSitemap` 立即使 sitemap 标签过期。保留当前失效顺序、重试、指标和非致命的降级结果行为。

4. **locale、内容 ID 和 slug 在请求时解析。** 删除根 `[locale]` 以及三个叶子路由的 `generateStaticParams()`。Next.js 16.4 的 Cache Components 和 Partial Prefetching 无需预先枚举这些动态参数即可生成页面外壳；生成器只用于选择构建时要预渲染的参数值，并非启用即时导航或 Cache Components 的要求。按此选择，这些动态路由不做整页 ISR 预渲染，每次请求渲染页面；带 `use cache` 的公开数据仍可跨请求复用。将路由参数读取和数据访问放在局部 Suspense 边界内，使未知 ID 和 slug 复用同一页面外壳。依赖运行时的 Metadata 按文档要求处理，并复用带标签的公开查询结果。

5. **使用小范围的局部 Suspense 边界。** 将公开页头、页脚设置、后台页面外壳及其他可复用缓存 UI 留在 App Shell。评论、当前年份、路由专属内容、认证检查和后台路由授权通过局部 fallback 流式处理。任何路由都不使用 `instant = false`；fallback 不包含后台私有数据，也不能绕过授权。后台现有的菜单 pending 行为和已认证页面外壳保持不变。

6. **迁移 Serwist，同时保持公开 worker URL。** 将 `@serwist/turbopack` 路由处理器生成方式替换为 Serwist configurator 模式，并在 `next build` 后构建 worker。保留 `/serwist/sw.js`、`src/app/sw.ts`、现有忽略规则和显式的 `/en/offline` 预缓存条目。移除旧路由处理器后，也就不再需要其 `dynamic`、`dynamicParams`、`revalidate` 和插件生成的 `generateStaticParams` 导出。

7. **sitemap 读取保持请求时执行并缓存数据。** 从 sitemap 处理器移除 `dynamic = 'force-dynamic'`。保留其 `unstable_cache` 函数和 sitemap 标签的即时失效；Cache Components 下仍支持这些用法。

## 风险与权衡

- **未知 ID 路由在 URL 专属查询完成前无法显示完整正文** → 让不同 ID/slug 共用 App Shell；按规范化输入缓存公开查询，并只在验证证明确有价值时使用逐链接预取。
- **远程缓存查询会增加网络延迟和托管成本** → 仅用于能跨临时实例复用、且可减少数据库负载的公开读取；会话、评论和高基数私有查询不缓存。
- **缓存标签过期不正确会导致成功写入后内容或 Metadata 仍旧** → 为每种结构化计划范围补充测试，并保留路径重新验证、Upstash 版本管理和现有重试约定。
- **认证周围的 Suspense 可能在 fallback 中暴露受保护内容** → 使用不含敏感信息的通用 fallback，并且只在现有认证和能力检查通过后渲染后台页面。
- **Serwist configurator 的产物或构建顺序可能改变离线行为** → 固定 worker URL 和离线预缓存约定，并在 Next 构建后运行生产 PWA 检查。
- **即时导航可能让客户端组件状态跨路由保留** → 检查当前依赖卸载的路由状态；测试证明需要时，保留显式重置行为。

## 迁移步骤

1. 添加缓存标签和带标签的公开查询函数，并将结构化失效计划映射到这些标签。
2. 启用 Cache Components 和 Partial Prefetching；移除 locale、ID 和 slug 生成器；将动态路由读取和 Metadata 标记放到安全边界内。
3. 将后台认证和授权移入由 Suspense 包裹的服务端子组件，同时保留现有已认证页面外壳和访问检查。
4. 让 sitemap 处理器不再依赖路由段配置；将 Serwist 迁移到 configurator 模式，同时保留 worker URL 和离线预缓存条目。
5. 使用 Next.js 即时导航诊断检查所有博客和后台路由；运行相关单元/PWA 测试、类型检查、lint 和生产构建。

## 待决问题

无。如果运行时验证显示某个公开目标需要预取 URL 专属内容，则为该目标的公开链接添加 `prefetch={true}` 并测量请求成本；后台链接继续使用 `auto`。
