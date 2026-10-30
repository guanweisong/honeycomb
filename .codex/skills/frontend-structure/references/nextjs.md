# Next.js 与前端约束

- 本工程使用当前安装版本的 Next.js；写代码前阅读 `node_modules/next/dist/docs/` 中相关指南，遵循本仓库生成的 Next.js agent rules。
- 使用 App Router，不新增 Pages Router。服务端默认优先；只有交互、浏览器 API 或客户端状态才使用 Client Component。
- `@/*` 用于源码绝对导入，`@tests/*` 用于测试；避免深层相对路径。Server-only 代码保持服务端边界，禁止被客户端 bundle 引入。
- Provider 放在最靠近实际消费者的位置；不要把局部状态升级为全局状态。服务端数据、URL 状态、表单状态和 UI 瞬时状态分别放在合适边界。
- UI 优先复用已有组件和设计系统；样式遵循仓库既有方案，不为局部需求引入新依赖或重复造组件。
- tRPC、TanStack Query 和缓存的使用遵循现有运行时与 feature 边界；新增依赖前检查 package、版本和现有能力。
- 涉及框架与业务组合时，读取[架构规则索引](architecture.md)，不在此重述依赖规则。
- 本轮路由迁移保留客户端导航/历史替换时序：post/page 根入口仍使用 `useLayoutEffect` / `router.replace`；`app/admin/(dashboard)` 的认证 layout/template 不随无职责 `(root)` 的移除而删除。具体迁移决策见[当前 design](../../../../openspec/changes/refine-directory-ownership/design.md)。

- 非框架发现的 worker 源实现归 `app/pwa`，由 `scripts/build-serwist.ts` 显式构建；跨 sitemap 路由的服务端实现归 `app/lib/server`。移动源码时同步构建入口、精确覆盖率路径及服务端门禁，公开 URL 不变。
