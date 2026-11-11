## MODIFIED Requirements

### Requirement: 博客公开页面读取使用所属路由 tRPC caller

博客 App Router 页面与 Server Component MUST 在所属路由或组件中直接调用 `createServerClient()` 读取公开数据；MUST NOT 经过集中式 `public-queries.ts` 包装、React 请求缓存或 Next 远程查询缓存。文章与页面详情 MAY 使用具有明确生命周期的 Next 本地 `use cache` 缓存，以支持动态参数预取；此类缓存 MUST 使用内容 ID 标签及关联详情范围标签，并由结构化写入失效计划清除。分类、标签和作者列表 MAY 在所属路由内使用带明确生命周期的 Next 本地 `use cache` 缓存，以支持 URL 数据预取；列表缓存 MUST 使用 `public.blog-lists` 标签，并由文章索引或布局失效计划清除。列表的 `post.index` MUST 保持 Upstash 缓存实现，sitemap MUST 保持专属缓存实现。评论等请求时数据 MUST 由局部 Suspense 与请求时渲染边界承接。缓存填充中的 tRPC `requestId` MUST 仅用于内部上下文，MUST NOT 进入博客内容、查询参数或缓存键。

#### Scenario: 站点设置在下一次请求可见
- **WHEN** 设置或菜单写入成功并完成既有失效计划
- **THEN** 下一次博客请求通过 tRPC 读取到最新值，不依赖 Next 查询 tag

#### Scenario: 文章正文使用本地缓存参与预取
- **WHEN** 文章详情链接在生产环境完成完整预取
- **THEN** 路由内带明确生命周期的本地缓存 caller 返回正文详情，且预取响应包含正文

#### Scenario: 页面正文使用本地缓存参与预取
- **WHEN** 页面详情链接在生产环境完成完整预取
- **THEN** 路由内带明确生命周期的本地缓存 caller 返回正文详情，且预取响应包含正文

#### Scenario: 菜单分类列表预取首屏卡片
- **WHEN** 菜单中的分类链接完成完整预取
- **THEN** 列表本地缓存按 URL 参数返回首屏文章卡片，预取响应包含卡片数据且 `post.index` 继续经过 Upstash 缓存

#### Scenario: 列表内容写入使列表缓存失效
- **WHEN** 文章索引或菜单/布局写入成功并完成结构化缓存失效
- **THEN** `public.blog-lists` 标签失效，下一次预取或导航读取到更新的列表卡片、分类路径或站点标题

#### Scenario: 内容写入使详情缓存失效
- **WHEN** 文章或页面成功写入并完成结构化缓存失效
- **THEN** 对应 ID 的详情标签先于公开详情路径失效，下一次读取可观察到新内容

#### Scenario: 关联公开数据写入使详情缓存失效
- **WHEN** 作者或媒体写入成功并完成结构化缓存失效
- **THEN** 文章与页面详情范围标签失效；分类或标签写入成功时文章详情范围标签失效

#### Scenario: 文章列表仍使用 Upstash 缓存
- **WHEN** 博客页面读取文章列表
- **THEN** `post.index` 继续使用 feature 现有的 Upstash 缓存版本，不经过 Next 远程公开查询缓存

#### Scenario: sitemap 仍使用自身缓存
- **WHEN** sitemap 生成查询文章、页面或菜单
- **THEN** `sitemap-data.ts` 继续使用 sitemap 专属缓存与 tag 失效

#### Scenario: 公开查询失败
- **WHEN** 文章详情查询返回 NOT_FOUND、列表路由筛选项缺失或评论查询失败
- **THEN** 原有 not-found、redirect 或评论降级行为保持不变
