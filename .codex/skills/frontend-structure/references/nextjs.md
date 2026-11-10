# Next.js 与前端约束

- 本工程使用当前安装版本的 Next.js；写代码前阅读 `node_modules/next/dist/docs/` 中相关指南，遵循本仓库生成的 Next.js agent rules。
- 使用 App Router，不新增 Pages Router。服务端默认优先；只有交互、浏览器 API 或客户端状态才使用 Client Component。
- `@/*` 用于源码绝对导入，`@tests/*` 用于测试；避免深层相对路径。Server-only 代码保持服务端边界，禁止被客户端 bundle 引入。
- 路由家族的 `components`、站点路由组内的 `pwa`/`lib` 以及 `app/auth`、`app/trpc` 是普通共置目录，不是 Next.js `_folder` 私有目录；除 Next 明确发现的入口外，不在这些实现目录中放置 `page`、`route` 或 metadata 入口。目录命名不替代 `server-only`、类型导入或认证授权边界。
- Provider 放在最靠近实际消费者的位置；不要把局部状态升级为全局状态。服务端数据、URL 状态、表单状态和 UI 瞬时状态分别放在合适边界。
- UI 优先复用已有组件和设计系统；样式遵循仓库既有方案，不为局部需求引入新依赖或重复造组件。
- tRPC、TanStack Query 和缓存的使用遵循现有运行时与 feature 边界；新增依赖前检查 package、版本和现有能力。
- 涉及框架与业务组合时，读取[架构规则索引](architecture.md)，不在此重述依赖规则。
- 本轮路由迁移保留客户端导航/历史替换时序：post/page 根入口仍使用 `useLayoutEffect` / `router.replace`；`app/admin/(dashboard)` 的认证 layout/template 不随无职责 `(root)` 的移除而删除。具体迁移决策见[当前 design](../../../../openspec/changes/refine-directory-ownership/design.md)。

- 站点专属的 metadata 路由、数据实现及非框架发现的 worker 源码归所属站点路由组，例如博客的 `app/(blog)/robots.ts`、`app/(blog)/lib/server/sitemap-data.ts` 和 `app/(blog)/pwa`。博客页面直接使用 `app/trpc/server.ts` 的 server caller；不为公开查询建立集中式框架缓存包装。显式 worker 构建入口由 `scripts/build-serwist.ts` 维护；route group 不进入 URL。同一 App Router 的根 metadata URL 只有一个路由所有者，多个站点共用时必须采用唯一 host 分发入口或独立应用/部署。移动源码时同步构建入口、精确覆盖率路径及服务端门禁，公开 URL 不变。
