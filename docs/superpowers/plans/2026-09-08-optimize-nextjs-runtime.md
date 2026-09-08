# Next.js Runtime Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成公开缓存、服务端读取、图片、后台 bundle、PWA、浏览量、限流、Metadata 与可访问性的八项 Next.js 运行时改进。

**Architecture:** 保留 Next.js 16.3.4 的空 `generateStaticParams` 按需 SSG 与 `revalidatePath` 模型，用唯一失效适配器闭合所有公开写入；用 React `cache()` 做请求级去重。客户端能力按路由下沉，浏览量独立动态更新，Proxy 限流通过有界适配器隔离外部故障。

**Tech Stack:** Next.js 16.3.4 App Router、React 19.2、tRPC 11、TanStack Query 5、Serwist 9、Vitest 4、Playwright、TypeScript 6、Zod 4。

**Spec:** `openspec/changes/optimize-nextjs-runtime/design.md`

## Global Constraints

- 不启用或迁移 `cacheComponents`、PPR 或 `use cache`。
- 不修改数据库 schema、公开 URL、权限模型及既有 tRPC 输入输出。
- 不增加新的运行时依赖。
- 所有生产行为变更必须先写失败测试并确认失败原因。
- 写操作只在持久化成功后失效缓存，客户端不得提供缓存路径。
- 当前 Next.js 行为以 `node_modules/next/dist/docs/` 中 16.3.4 文档为准。

---

### Task 1: 闭合公开缓存失效矩阵

**Files:**
- Modify: `src/features/category/category.router.ts`
- Modify: `src/features/tag/tag.router.ts`
- Modify: `src/features/menu/menu.router.ts`
- Modify: `src/features/setting/setting.router.ts`
- Modify: `src/features/user/user.router.ts`
- Modify: `src/features/category/tests/category.router.test.ts`
- Modify: `src/features/tag/tests/tag.router.test.ts`
- Modify: `src/features/menu/tests/menu.router.test.ts`
- Modify: `src/features/setting/tests/setting.router.test.ts`
- Modify: `src/features/user/tests/user.router.test.ts`
- Create: `tests/public-cache-invalidation-boundaries.test.ts`

**Interfaces:**
- Consumes: `invalidateAllPublicContent(): Promise<void>` from `src/packages/infrastructure/refresh-path.ts`
- Produces: every public-visible successful mutation invalidates the locale layout after persistence

- [ ] **Step 1: 写失败测试**

在各 Router 测试中 mock `invalidateAllPublicContent`，分别执行 create/update/destroy/saveAll/updateSetting，并断言成功时调用一次、Repository 拒绝时不调用。静态治理测试读取公开可见 Router 的 mutation 注册，确保失效器是业务结果后的 side effect。

- [ ] **Step 2: 验证 RED**

Run: `bun run test:unit:run -- src/features/category/tests/category.router.test.ts src/features/tag/tests/tag.router.test.ts src/features/menu/tests/menu.router.test.ts src/features/setting/tests/setting.router.test.ts src/features/user/tests/user.router.test.ts tests/public-cache-invalidation-boundaries.test.ts`

Expected: FAIL，因为这些 Router 尚未调用 `invalidateAllPublicContent`。

- [ ] **Step 3: 最小实现**

将 mutation handler 改成 `async`，先 await Use Case，成功后 await `invalidateAllPublicContent()`，最后返回原结果。错误映射位置不变。

- [ ] **Step 4: 验证 GREEN 并提交**

Run: 同 Step 2；Expected: PASS。

Commit: `fix(cache): invalidate all public content writes`

### Task 2: 统一请求级公开读取

**Files:**
- Create: `src/app/lib/server/public-queries.ts`
- Create: `src/app/lib/server/public-queries.test.ts`
- Modify: `src/app/lib/server/site-setting.ts`
- Modify: `src/app/(blog)/components/Header/index.tsx`
- Modify: `src/app/(blog)/components/Footer/index.tsx`
- Modify: `src/app/(blog)/[locale]/archives/[id]/page.tsx`
- Modify: `src/app/(blog)/[locale]/pages/[id]/page.tsx`
- Modify: `src/app/(blog)/[locale]/list/[...slug]/page.tsx`
- Modify: `src/features/comment/public/components/index.tsx`

**Interfaces:**
- Produces: `getPublicSetting()`, `getPublicMenu()`, `getPublicPostDetail(id)`, `getPublicPageDetail(id)`, `getPublicComments(id, type)`，均为 `server-only` 且由 React `cache()` 包装
- Produces: `Comment` 接收已存在的 `Promise<CommentTreeViewResponse>`，不再自行创建 caller

- [ ] **Step 1: 写失败测试并验证 RED**

mock `createServerClient`，在同一测试中连续调用每个目标 Query 两次，断言对应 caller 方法只调用一次；渲染详情页时断言评论读取只发生一次。

Run: `bun run test:unit:run -- src/app/lib/server/public-queries.test.ts src/app/(blog)/[locale]/archives/[id]/page.test.ts src/app/(blog)/[locale]/pages/[id]/page.test.tsx`

Expected: FAIL，因为统一 Query 尚不存在且评论会重复读取。

- [ ] **Step 2: 实现请求级 Query 并迁移消费者**

每个包装函数以稳定标量作为参数：

```ts
export const getPublicPostDetail = cache(async (id: string) => {
  const client = await createServerClient();
  return client.post.detail({ id });
});
```

页面与 `generateMetadata` 共同调用这些函数；列表筛选输入先规范化为字符串参数，避免对象引用导致 cache miss。详情页面创建一次评论 Promise，同时用于计数和 Client Component。

- [ ] **Step 3: 验证 GREEN、类型与提交**

Run: Step 1 测试及 `bun run check-types`；Expected: PASS。

Commit: `perf(rsc): deduplicate public server queries`

### Task 3: 修正响应式图片策略

**Files:**
- Modify: `next.config.ts`
- Create: `tests/next-image-config.test.ts`
- Modify: `src/features/media/shared/MediaGrid/index.tsx`
- Modify: `src/features/post/public/components/PostList/index.tsx`
- Modify: `src/app/(blog)/components/RichText/index.tsx`
- Modify: `src/features/media/shared/MediaGrid/index.test.tsx`
- Modify: `src/features/post/public/components/PostList/index.test.tsx`
- Modify: `src/app/(blog)/components/RichText/index.test.tsx`

**Interfaces:**
- Produces: small `imageSizes` including 48/96/128/256/384, responsive `deviceSizes`, formats `image/avif` then `image/webp`

- [ ] **Step 1: 写配置行为失败测试并验证 RED**

调用导出的 Next config，断言 48px 与 96px 候选存在、`imageSizes` 均小于最小 `deviceSizes`、格式数组包含 AVIF/WebP；组件测试断言媒体网格使用固定 128px `sizes`。

Run: `bun run test:unit:run -- tests/next-image-config.test.ts src/features/media/shared/MediaGrid/index.test.tsx`

Expected: FAIL，当前最小候选为 960 且只有 WebP。

- [ ] **Step 2: 最小实现并验证 GREEN**

设置 `deviceSizes: [640, 750, 828, 960, 1080, 1280, 1536, 1920]`、`imageSizes: [20, 32, 48, 64, 96, 128, 256, 384]`、`formats: ["image/avif", "image/webp"]`，同步 `sizes`。

Run: 图片测试与 `bun run check-types`；Expected: PASS。

Commit: `perf(images): align responsive image sizes`

### Task 4: 下沉后台大型客户端依赖

**Files:**
- Modify: `src/app/admin/AdminProviders.tsx`
- Create: `src/features/post/admin/edit/components/EditorMediaProvider/index.tsx`
- Modify: `src/app/admin/(root)/(dashboard)/post/edit/page.tsx`
- Modify: `src/app/admin/(root)/(dashboard)/page/edit/page.tsx`
- Modify: `src/app/admin/(root)/(dashboard)/dashboard/page.tsx`
- Modify: `src/features/menu/admin/page.tsx`
- Create: `tests/admin-client-boundaries.test.ts`
- Modify: `src/features/page/admin/edit/components/PageEditorPage/index.test.tsx`
- Modify: `src/app/admin/(root)/(dashboard)/dashboard/components/DashboardPageClient/index.test.tsx`

**Interfaces:**
- Produces: route-local `EditorMediaProvider({ children })`
- Produces: lazy client wrappers with accessible `role="status"` fallback

- [ ] **Step 1: 写失败边界测试并验证 RED**

测试 `AdminProviders.tsx` 不直接或间接导入 PhotoPicker、MediaPageShell、Tiptap media provider；普通 dashboard client manifest 不得列出 Tiptap/ProseMirror chunk。

Run: `bun run test:unit:run -- tests/admin-client-boundaries.test.ts`

Expected: FAIL，当前全局 Provider 直接导入媒体选择能力。

- [ ] **Step 2: 下沉 Provider 与动态入口**

从 `AdminProviders` 删除媒体选择实现；在文章和页面编辑入口包裹 route-local Provider。用 `next/dynamic` 延迟加载 `DashboardPageClient`、菜单树页面和编辑器主体；SSR 不兼容的纯客户端能力显式 `ssr: false`，其余保留 SSR。

- [ ] **Step 3: 验证并提交**

Run: 编辑器、Dashboard、菜单、边界测试及 `bun run check-types`；Expected: PASS。

Commit: `perf(admin): localize heavy client providers`

### Task 5: 控制 PWA 预缓存预算

**Files:**
- Modify: `next.config.ts`
- Create: `tests/pwa-precache-config.test.ts`
- Modify: `tests/e2e/blog/pwa-offline.spec.ts`

**Interfaces:**
- Produces: Serwist `globIgnores` 排除 screenshots、map 和后台资源，同时保留 `/offline` 与图标

- [ ] **Step 1: 写失败配置测试并验证 RED**

使用实际 glob 匹配小型 fixture，断言 desktop/mobile screenshots、`*.map`、admin chunks 被排除，offline 页面与图标未被排除。

Run: `bun run test:unit:run -- tests/pwa-precache-config.test.ts`

Expected: FAIL，因为尚未配置排除规则。

- [ ] **Step 2: 配置排除并验证 GREEN**

向 `withSerwist` 配置添加窄化 `globIgnores`，避免排除公开站点运行必需共享 chunk。运行单测与 PWA E2E。

Commit: `perf(pwa): reduce offline precache scope`

### Task 6: 建立动态浏览量闭环

**Files:**
- Modify: `src/features/post/post.router.ts`
- Modify: `src/features/page/page.router.ts`
- Modify: `src/app/(blog)/components/ViewTracker/index.tsx`
- Modify: `src/app/(blog)/components/PostInfo/index.tsx`
- Modify: `src/app/(blog)/components/ViewTracker/index.test.tsx`
- Modify: `src/app/(blog)/[locale]/archives/[id]/page.tsx`
- Modify: `src/app/(blog)/[locale]/pages/[id]/page.tsx`
- Modify: `src/app/(blog)/[locale]/archives/[id]/page.test.ts`
- Modify: `src/app/(blog)/[locale]/pages/[id]/page.test.tsx`

**Interfaces:**
- Produces: `PostViewTracker` / `PageViewTracker` client components that render the localized count from `initialViews`, then replace it with the increment mutation's `{ views }` result
- Consumes: existing increment mutations only; no new count query or router output is added

- [ ] **Step 1: 写失败组件与 Router 测试并验证 RED**

断言 mutation 成功后显示返回计数，失败时保留初始值且正文不抛错；断言 post/page increment procedure 不调用缓存失效器。

Run: `bun run test:unit:run -- src/app/(blog)/components/ViewTracker/index.test.tsx src/features/post/tests/post.router.test.ts src/features/page/tests/page.router.test.ts`

Expected: FAIL，当前 Tracker 不渲染计数。

- [ ] **Step 2: 最小实现与迁移**

将浏览量文本交由 Client Component 渲染；静态详情只传初始值。优先使用 increment mutation 的 `{ views }` 返回值，失败时保持初始值，不调用 `router.refresh()` 或 `revalidatePath`。

- [ ] **Step 3: 验证并提交**

Run: `bun run test:unit:run -- src/app/(blog)/components/ViewTracker/index.test.tsx src/app/(blog)/[locale]/archives/[id]/page.test.ts src/app/(blog)/[locale]/pages/[id]/page.test.tsx src/features/post/tests/post.router.test.ts src/features/page/tests/page.router.test.ts` 和 `bun run check-types`；Expected: PASS。

Commit: `feat(views): update public counts dynamically`

### Task 7: 有界并可组合的 API 限流

**Files:**
- Modify: `src/packages/infrastructure/rate-limit/rate-limit.ts`
- Modify: `src/packages/infrastructure/rate-limit/rate-limit.test.ts`
- Modify: `src/proxy.ts`
- Modify: `tests/proxy.test.ts`
- Create: `src/packages/trpc/api/rate-limited-procedure.ts`
- Create: `src/packages/trpc/api/rate-limited-procedure.test.ts`
- Modify: `src/features/comment/comment.router.ts`
- Modify: `src/features/comment/tests/comment.router.test.ts`

**Interfaces:**
- Produces: `limitWithTimeout(limiter, identifier, options): Promise<RateLimitResult>`
- Produces: `createRateLimitedPublicProcedure({ limiter, namespace })`, composed before the handler and dependency-injectable in tests
- Timeout result: `{ success: false, unavailable: true, ... }` in production; explicit local allow result in development/test

- [ ] **Step 1: 写 Proxy 超时与环境策略失败测试并验证 RED**

使用永不 resolve 的 fake limiter 与 fake timers，断言等待上限后生产返回 503、开发继续；provider reject 不形成未处理异常。

- [ ] **Step 2: 实现有界适配器并验证 GREEN**

通过 `Promise.race` 与清理 timer 实现；默认上限从环境 schema 的有限正整数读取或使用固定安全默认值。沿用现有结果结构与指标入口。

- [ ] **Step 3: 写 procedure 独立限流失败测试并实现**

创建真实测试 Router，达到限额后断言 handler 计数不增加且得到 `TOO_MANY_REQUESTS`。为 `comment.create` 创建独立的 5 次/分钟 limiter（独立 prefix），通过该 procedure 组合，不复制验证码或权限逻辑。

- [ ] **Step 4: 验证并提交**

Run: rate-limit、proxy、目标 Router 测试及类型检查；Expected: PASS。

Commit: `feat(security): bound API rate limiting`

### Task 8: 完善 Metadata、404 与缩放

**Files:**
- Modify: `src/app/(blog)/[locale]/layout.tsx`
- Modify: `src/app/(blog)/[locale]/archives/[id]/page.tsx`
- Modify: `src/app/(blog)/[locale]/pages/[id]/page.tsx`
- Modify: `src/app/(blog)/[locale]/list/[...slug]/page.tsx`
- Create: `src/app/not-found.tsx`
- Create: `src/app/not-found.test.tsx`
- Modify: `src/app/admin/layout.tsx`
- Modify: `src/app/app-structure.test.ts`
- Modify: `src/app/(blog)/[locale]/archives/[id]/page.test.ts`
- Modify: `src/app/(blog)/[locale]/pages/[id]/page.test.tsx`
- Modify: `src/app/(blog)/[locale]/list/[...slug]/page.test.tsx`

**Interfaces:**
- Produces: root `metadata` with `metadataBase`, title template, OG/Twitter defaults
- Produces: locale canonical and language alternates derived from validated locale/path
- Produces: exported `viewport: Viewport` without zoom restrictions

- [ ] **Step 1: 写失败 Metadata、404、viewport 测试并验证 RED**

直接调用 Metadata 函数断言英文 canonical、中文 alternate、默认社交图和本地化 title；渲染 not-found 断言 alert/status 与首页链接；断言 admin viewport 不含 maximumScale/userScalable。

- [ ] **Step 2: 实现并验证 GREEN**

使用已验证的 `NEXT_PUBLIC_SITE_URL` 构造 `metadataBase`，通过 next-intl 路由 helper 生成 locale URLs；not-found 使用普通 `<Link>`，不引入客户端边界；后台改用 Viewport API。

- [ ] **Step 3: 提交**

Run: Metadata、结构、not-found、a11y 测试及类型检查；Expected: PASS。

Commit: `feat(web): complete metadata and a11y fallbacks`

### Task 9: 全量验证和 OpenSpec 收尾

**Files:**
- Modify: `openspec/changes/optimize-nextjs-runtime/tasks.md`
- Create: `openspec/changes/optimize-nextjs-runtime/verification.md`

**Interfaces:**
- Produces: 全部任务勾选及可复核验证证据

- [ ] **Step 1: 运行静态和单元门禁**

Run: `bun run check-types && bun run lint && bun run test:unit:run && bun run test:unit:coverage && bun run db:migrations:check && git diff --check`

- [ ] **Step 2: 运行生产与 E2E 门禁**

Run: 使用项目测试环境变量执行 `bun run build`、`bun run analyze`，然后运行安全 Header、RBAC、PWA、a11y、首页、文章详情及性能 Playwright 用例。

- [ ] **Step 3: 比较交付指标**

记录路由分类、PWA 预缓存数量/体积、后台公共 Provider chunks、构建警告；确认普通后台路由不含编辑器 chunk，预缓存不含 screenshots/map。

- [ ] **Step 4: 更新 OpenSpec 并最终提交**

将 `tasks.md` 全部勾选，写入 `verification.md`，运行 `openspec validate optimize-nextjs-runtime --strict`。

Commit: `docs(openspec): verify Next.js runtime tuning`
