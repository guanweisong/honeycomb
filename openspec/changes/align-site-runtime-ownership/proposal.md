## 为什么

博客 sitemap 生成逻辑、公开查询调用和 Service Worker 策略都只服务 `(blog)`，但之前用一个聚合查询模块承载了多种缓存与去重策略，增加了阅读跳转。现在把站点运行时实现归组、移除该查询层，并明确根 URL 与 route group 的关系，避免继续复制或误共享策略。

## 变更内容

- 将 robots、sitemap 入口及生成实现、PWA worker 源码与策略移入 `(blog)` 路由组，保持公开 URL、缓存和离线行为不变。
- 移除博客 `public-queries.ts` 聚合层；博客路由和组件直接调用 tRPC server caller。后台登录继续直接调用公开设置 procedure。
- 更新 Serwist 构建入口、测试导入、覆盖率/架构门禁及当前工程约定。
- 明确 route group 不创建 URL 命名空间；同一应用的多个站点共用根 metadata URL 时必须由单一入口按 host 分发，或使用独立应用/部署。

## 能力

### 新增能力

无。

### 修改能力

- `package-layer-architecture`：站点专属运行时实现归所属站点路由组；Next 根 URL 入口保持单一所有者。
- `pwa-offline-reliability`：唯一 Service Worker 源路径归 `(blog)`，生成 URL 与行为保持不变。
- `coverage-governance`：精确 Service Worker 覆盖率排除跟随站点源码路径。

## 影响

影响 `(blog)` 站点、后台登录页、Next metadata 路由、Serwist 构建入口与相关质量配置。博客公开页面改为请求时直接读取 tRPC，移除该层的 React 去重和 Next 远程缓存，因此数据库读取会增加；文章列表的 Upstash 缓存与 sitemap 缓存保持不变。无公开 URL、数据库或依赖变更。
