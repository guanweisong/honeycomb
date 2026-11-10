## REMOVED Requirements

### Requirement: 结构化失效会使 Cache Components 标签过期

## ADDED Requirements

### Requirement: 博客公开页面读取使用请求时 tRPC caller

博客 App Router 页面与 Server Component MUST 在所属路由或组件中直接调用 `createServerClient()` 读取公开数据；MUST NOT 经过集中式 `public-queries.ts` 包装、React 请求缓存或 Next 远程查询缓存。请求时读取 MUST 由 Next 的请求时渲染边界承接。文章列表已有的 Upstash 缓存和 sitemap 专属缓存 MUST 保持各自实现。

#### Scenario: 站点设置在下一次请求可见

- **WHEN** 设置或菜单写入成功并完成既有失效计划
- **THEN** 下一次博客请求通过 tRPC 读取到最新值，不依赖 Next 查询 tag

#### Scenario: 文章列表仍使用 Upstash 缓存

- **WHEN** 博客页面读取文章列表
- **THEN** `post.index` 继续使用 feature 现有的 Upstash 缓存版本，不经过 Next 远程公开查询缓存

#### Scenario: sitemap 仍使用自身缓存

- **WHEN** sitemap 生成查询文章、页面或菜单
- **THEN** `sitemap-data.ts` 继续使用 sitemap 专属缓存与 tag 失效

#### Scenario: 生成列表快照标识

- **WHEN** 列表页面生成 `snapshotVersion`
- **THEN** `crypto.randomUUID()` MUST 在 `connection()` 之后执行，避免在 prerender 时生成不稳定值

#### Scenario: 公开查询失败

- **WHEN** 文章详情查询返回 NOT_FOUND、列表路由筛选项缺失或评论查询失败
- **THEN** 原有 not-found、redirect 或评论降级行为保持不变
