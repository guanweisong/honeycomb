## Context

公开站点运行在 Next.js 16.3.4 App Router 上，动态内容路由通过空 `generateStaticParams` 实现运行时按需 SSG，并由服务端 `revalidatePath` 失效。现有文章、页面和评论写入已接入失效，但菜单、设置、分类、标签和公开作者资料尚未覆盖；页面、Metadata、Header、Footer 和评论嵌套组件也分别通过 tRPC server caller 重复读取相同数据。

后台 Dashboard 的公共 Client Component 边界持有媒体选择能力，扩大所有后台页面的共享依赖。图片候选尺寸从 960px 起步，Service Worker 预缓存约 7MiB，静态详情页中的浏览量无法随独立计数写入更新。Proxy 对所有 API 请求执行远程限流，但缺少显式的有界等待与降级语义。SEO、404 和后台缩放能力也未形成完整体验边界。

本变更面向公开访客、内容管理员和运维人员，必须保持公开 URL、数据库 schema、权限模型、API 输入输出以及当前非 `cacheComponents` 缓存模式兼容。

## Goals / Non-Goals

**Goals:**

- 让所有公开可见写入都具有明确、受限、可测试的缓存失效结果。
- 消除单次渲染中页面、Metadata、布局和嵌套组件的等价重复读取。
- 降低小图传输、后台公共 JS 和 Service Worker 安装流量。
- 让浏览量在不触发 SSG 再生成的情况下动态更新。
- 让限流故障有界且可观测，并保留高成本 procedure 的独立策略入口。
- 完成 404、缩放、canonical、hreflang、`metadataBase` 和默认社交图片体验。

**Non-Goals:**

- 不启用或迁移 Next.js `cacheComponents`、PPR、`use cache`。
- 不修改数据库字段、迁移、内容 URL、管理权限和既有 tRPC 输入输出。
- 不引入新的缓存服务、状态管理库、图片 CDN 或可观测性供应商。
- 不把所有读操作改造成长期 Data Cache；本轮请求去重只使用 React `cache()`，持久缓存继续由 Full Route Cache、既有 Upstash 缓存和 Sitemap 缓存承担。

## Decisions

### 1. 以公开渲染影响面驱动缓存失效

保留 `invalidatePublicContent` 和 `invalidateAllPublicContent` 作为唯一 Next.js 失效适配器。文章、页面及可恢复目标的评论继续失效具体详情并刷新公开 locale layout；菜单、设置、分类、标签和公开作者资料写入统一调用 `invalidateAllPublicContent`。失效只在持久化成功后执行，客户端不得提交路径。

选择该方案而不是立即建立细粒度 Cache Tags，是因为当前 Full Route Cache 已以路径失效为权威机制，且未启用 Cache Components。全量 locale layout 失效范围较大，但行为简单、可回滚，后续可在真实流量数据支持下演进为 tags。

### 2. 请求级读取由所属 Feature 的纯服务端 Query 统一

为 setting、menu、post detail、page detail、comment list 和列表 Metadata 所需查询建立 `server-only` 的 `cache()` 包装。包装器接收稳定的标量或规范化输入，内部创建 server caller；页面、Metadata 和布局引用同一函数。评论详情页把同一 Promise/结果传给计数与 `CommentClient`，不再由嵌套 Server Component 重查。

选择 React `cache()` 而不是 `unstable_cache`，因为目标是单次 RSC/Metadata 渲染去重，而不是新增跨请求数据缓存及第二套失效机制。

### 3. 图片目录按真实布局宽度配置

`imageSizes` 覆盖 20、32、48、64、96、128、256、384 等固定小图，`deviceSizes` 覆盖常见移动端到桌面端宽度并保留 1920。输出格式使用 AVIF 与 WebP。现有 `sizes` 属性按实际 CSS 宽度校正，媒体网格不再使用过小且与固定 128px 容器不一致的 `7vw`。

### 4. Provider 只保留全后台共同依赖

`AdminProviders` 仅保留 tRPC、React Query、CurrentUser 和 SiteSetting。Tiptap 媒体选择 Provider 与 PhotoPicker 下沉到文章/页面编辑边界；重型编辑器、图表和可排序树使用路由级拆分或 `next/dynamic`，并提供可访问的加载占位。类型契约留在公开 UI 边界，不让页面依赖 Provider 内部实现。

### 5. PWA 采用显式预缓存预算

Serwist 构建配置排除 Manifest screenshots、source map、非离线关键后台路由资源及其他大体积非关键资产。离线文档、图标和公开站点核心静态资源继续预缓存。测试既验证排除模式，也验证必要离线入口仍存在；构建日志中的预缓存总量作为人工和 CI 分析证据。

### 6. 浏览量使用客户端动态读写闭环

保留现有尽力上报 mutation，并让其返回的最新计数替换静态兜底值；每次进入或刷新页面都会执行该 mutation，因此无需再增加一次轻量查询。静态 HTML 不再把数据库浏览量当成最终权威展示，也不为计数写入调用 `revalidatePath`。mutation 仍仅允许已发布内容。

### 7. 限流采用有界等待和可选 procedure 策略

Proxy 限流通过可注入的超时竞争器执行。超时或供应商故障按显式环境策略降级：生产环境默认失败关闭并返回 503，开发/测试可使用本地允许策略；所有降级都记录现有安全指标。tRPC 提供可组合的限流 middleware/工厂，仅为验证码、登录相关或高成本 procedure 接线，不复制权限逻辑。

### 8. Metadata 与可访问性在根布局统一

公开根布局提供 `metadataBase`、默认 title 模板、description、Open Graph/Twitter 图片；locale 页面生成 canonical 与两种语言的 alternates，详情 Metadata 继续覆盖内容标题。新增全局 not-found 页面和可访问的返回入口。后台使用 Next Viewport API，移除 `maximum-scale` 和 `user-scalable=0`。

## Risks / Trade-offs

- [全量 locale layout 失效可能增加下一次访问的重建成本] → 仅对无法安全定位单页的写操作使用，并保留现有具体详情失效入口。
- [React `cache()` 的键依赖参数稳定性] → 包装器只接受字符串、数字或规范化序列化输入，并通过调用次数测试锁定行为。
- [动态加载可能改变编辑器初始化时序] → 提供固定 loading fallback，并用编辑与媒体选择组件测试及关键 E2E 验证。
- [AVIF 首次优化成本高于 WebP] → 保留 WebP 回退，并依赖既有长期图片缓存摊销成本。
- [浏览量客户端 mutation 增加一个小请求] → 复用该请求的返回计数，不追加查询，且失败不阻塞正文。
- [生产限流失败关闭会降低外部服务故障时的 API 可用性] → 使用短超时、503 与可观测指标，避免请求无限等待；安全默认不改为静默放行。
- [Metadata 根默认值与站点动态设置可能短暂不一致] → 静态默认只作兜底，动态页面继续使用 setting，并纳入设置写入后的失效测试。

## Migration Plan

1. 先增加失败测试，锁定缓存失效、请求去重、图片配置、预缓存排除、浏览量、限流和 Metadata 预期。
2. 分别接入公开失效与请求级 Query，不改变路由和 tRPC 契约。
3. 下沉后台 Provider 并启用动态加载，使用构建 manifest 比较公共依赖。
4. 调整图片和 PWA 配置，使用生产构建确认候选配置与预缓存体积。
5. 完成浏览量、限流、Metadata、404 和 viewport，再运行完整质量门禁与关键 E2E。
6. 若部署后出现缓存或加载回归，可按任务提交边界逐项回滚；数据库和 URL 无迁移，因此不需要数据回滚。

## Open Questions

无。实现以已确认设计和当前 Next.js 16.3.4 本地文档为准。
