## 背景

博客的 robots、sitemap、公开 tRPC 调用与 Serwist worker 都由 `(blog)` 页面消费或只生成博客 URL。站点专属实现归 `(blog)` 所有；公开页面不再增加聚合查询/缓存层，而是在实际路由或组件中直接调用 server caller。Next route group 不进入 URL，因此框架识别的根 metadata 路由可在 `(blog)` 内归组并保持现有 URL；不过 route group 也不会提供 URL 命名空间。

## 目标 / 非目标

**目标：**

- 将博客专属的 metadata 路由、sitemap 数据与 worker 策略移入 `(blog)`。
- 移除博客公开查询聚合层，路由和组件直接使用应用 server caller；公开数据每次请求读取。
- 保持 `/robots.txt`、`/sitemap.xml`、`/sitemaps/{id}` 和 `/serwist/sw.js` 的公开契约及现有 sitemap、缓存、离线行为。
- 更新所有静态路径消费者、架构规则和质量配置。

**非目标：**

- 本次不新增第二个站点，不实现 host 路由器或多租户 site registry。
- 不改变 Service Worker 的 URL、`/` scope、缓存规则、离线 fallback、缓存 tag/key 或 sitemap 内容。
- 移除博客公开查询层的 remote cache、请求内去重与 cache tag；保留文章列表自己的 Upstash 缓存和 sitemap 的专属缓存。
- 不调整已位于 `(blog)` 的 localized manifest。

## 决策

1. **框架 metadata 入口与站点实现一起归组。** 将 `robots.ts`、`sitemap.xml/route.ts`、`sitemaps/[id]/route.ts` 放入 `src/app/(blog)`。Next route group 不参与 URL，因此对外路径不变。未来同一 App Router 增加另一个站点且要求同一个根 URL 时，必须保留一个根路径所有者并按 host 分发，或拆为独立应用/部署；不得在另一个 route group 中重复相同 URL。
2. **非框架发现的 worker 跟随站点归属。** 将 `src/app/pwa` 整体迁至 `src/app/(blog)/pwa`，并更新 `scripts/build-serwist.ts` 的显式入口。构建产物仍为 `public/serwist/sw.js`，BlogProviders 的注册 URL 与 `/` scope 保持不变。
3. **测试与门禁同步迁移。** sitemap 单测、robots 单测和 PWA 就近测试随实现移动；集成测试继续调用同一公开 handler。更新 lint 变更分类、精确覆盖率路径、server-only/路径契约和测试指南，不扩大覆盖率排除。
4. **保留当前数据与副作用链。** sitemap 仍通过原有延迟导入查询公开文章、页面和菜单分类；worker 仍使用现有预缓存与运行时缓存策略。迁移只改路径和消费者。
5. **博客页面直接使用 tRPC caller。** 删除 `public-queries.ts` 及其 React `cache()`、Next `use cache: remote` 和 tag 包装；Header、Footer、localized layout、文章/页面路由、列表解析、评论和 manifest 在所属页面/组件调用 `createServerClient()`。好友链接完整分页留在友链页面，文章详情 NOT_FOUND 继续由路由边界映射。后台登录同样直接调用公开 `setting.index()`。
6. **未缓存读取在请求时渲染。** 公开 Server Component 的直接 tRPC 读取由现有/新增 Suspense 边界承接；列表 `snapshotVersion` 在 `connection()` 之后生成，避免 prerender 期间的 `crypto.randomUUID()`。
7. **只失效仍存在的缓存。** 删除已无消费者的 `public.layout`、`public.post-index`、详情 Next tag；继续提升文章索引 Upstash 版本、失效 sitemap tag，并按现有结构化计划调用 `revalidatePath`。

## 风险 / 取舍

- **route group 不隔离 URL，未来第二个站点可能与根 metadata 路由冲突** → 当前只保留博客这一个所有者，并在规范中明确多站点共用根 URL 时的 host 分发/独立部署要求。
- **显式路径列表可能遗漏静态工具消费者** → 移动前后用全仓搜索更新构建、测试、覆盖率、质量分类、文档和架构门禁。
- **路径移动可能改变静态渲染或运行时行为** → 保持实现内容和导入时机，只更新路径，并把真实构建/E2E 验证状态与静态检查分开记录。
- **移除远程查询缓存会增加数据库请求** → 公开页面直接读 tRPC，接受 metadata/页面组合之间的重复读取；保留文章索引 Upstash 缓存与 sitemap 缓存，并在验证中确认其仍有消费者。
- **公开读取从缓存回退到请求时** → 在布局头尾和页面 metadata/正文路径提供 Next 需要的动态边界，保持 `crypto.randomUUID()` 只在请求时执行。

## 迁移计划

1. 将 metadata 路由、sitemap helper 与 PWA 源码/就近测试移动至 `(blog)`。
2. 删除博客公开查询聚合模块，将查询调用移至实际博客路由/组件，并保留必要的分页与错误处理。
3. 删除失去消费者的 Next 查询 tag，保留 Upstash 文章索引与 sitemap 缓存失效。
4. 更新构建入口、静态消费者、测试 mock、阅读地图、缓存说明和现行目录规则。
5. 执行允许的静态质量检查；路由构建与 PWA 行为按可用环境验证。
6. 如需回退，按路径映射反向移动整组文件，并同步恢复所有显式路径配置。

## 开放问题

无。第二个站点使用独立域名/部署还是同一 host 下的路径前缀，应在站点实现开始时决定。
