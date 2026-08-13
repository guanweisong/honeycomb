## 目标架构

`src/app/admin/layout.tsx`、`src/app/admin/page.tsx`、`src/app/admin/(root)/layout.tsx` 和 `src/app/admin/(root)/(dashboard)/layout.tsx` 使用 Server Component。新增 `AdminProviders` Client Component，隔离 React Query、tRPC、Tiptap 媒体选择器和 Toaster。

服务端认证独立为 `getAdminUser`，通过 Next 当前请求的 headers 调用 Better Auth；不复用当前 `createServerClient()` 的无请求上下文，避免服务端请求被静默识别为未登录。缺失、失效或禁用用户均视为未认证。

dashboard 壳层在服务端读取当前用户和站点设置，并据此生成菜单。登出事件仍由客户端组件执行。复杂业务页面保持原有 Client Component，后续可单独迁移首屏查询。

## 数据流

1. Server Layout 调用 `getAdminUser`。
2. 登录页允许匿名访问；已登录用户重定向到 dashboard。
3. dashboard 路由无用户时服务端重定向到登录页。
4. 已认证用户的用户信息、站点设置和菜单作为 props 传给客户端交互壳层。
5. 客户端 Provider 继续提供现有 tRPC React hooks 和缓存能力。

## 测试策略

- 为认证函数覆盖有效用户、无会话和禁用用户。
- 为 `/admin` 重定向和认证守卫保留路由级回归验证。
- 运行相关 Vitest、类型检查和生产构建。
