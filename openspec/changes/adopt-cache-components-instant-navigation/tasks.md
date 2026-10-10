## 1. 公开缓存与失效

- [x] 1.1 添加权威的公开缓存标签，并为标签映射补充测试。
- [x] 1.2 为设置、菜单、链接、文章/页面详情、列表结果、随机相关文章、标签和作者添加带标签的公开查询辅助函数；评论保持为请求内数据。
- [x] 1.3 允许公开缓存填充使用稳定且有类型约束的请求上下文，不改变普通调用默认的请求 ID 行为。
- [x] 1.4 扩展 `publicContentInvalidator` 以清除匹配标签，同时保留 Upstash 版本管理、路径失效、处理顺序、重试和降级结果。

## 2. Cache Components 与公开导航

- [x] 2.1 启用 Cache Components 和 Partial Prefetching，同时保留其他无关的 Next.js 配置。
- [x] 2.2 移除根 `[locale]`、归档、页面和列表路由中的 `generateStaticParams()`，由 Cache Components 为请求时参数提供可复用页面外壳。
- [x] 2.3 将归档、页面详情和列表路由中依赖 URL 的页面读取及运行时 Metadata 标记放入页面局部边界。
- [x] 2.4 将评论和当前年份放到局部 fallback 后流式返回；博客站内 `Link` 使用 `prefetch={true}` 预取目标内容，后台链接保留 `auto`。
- [x] 2.5 更新受影响的路由和组件测试，覆盖先显示页面外壳的行为和生成器约定。

## 3. 后台即时导航

- [x] 3.1 将 dashboard 认证和路由能力检查放到 Suspense 后，同时确保受保护 UI 不出现在 fallback 中。
- [x] 3.2 将登录页请求头和搜索参数放入局部 Suspense 边界，不改变重定向或 callback 校验。
- [x] 3.3 保留现有后台菜单的 `auto` 预取，以及页面外壳和导航 pending 行为；补充覆盖，确保私有路由数据不会进入共享缓存。

## 4. Sitemap 与 PWA 兼容性

- [x] 4.1 从 sitemap 处理器移除不受支持的 `dynamic` 导出，并保留带标签的 `unstable_cache` 行为。
- [x] 4.2 用 configurator 模式替换 Serwist Turbopack 路由处理器，同时保留 `/serwist/sw.js`、离线预缓存、worker 运行时规则和生成文件忽略配置。
- [x] 4.3 更新 Bun 脚本和依赖，使开发环境可以监视 worker，并让生产构建在 `next build` 后生成 worker。
- [x] 4.4 更新 PWA 测试，断言离线 fallback 和 worker URL 保持不变。

## 5. 验证与交付

- [x] 5.1 对所有公开和后台目标运行 Cache Components 即时导航诊断；解决所有阻塞项，不使用 `instant = false`。
- [x] 5.2 运行相关单元测试、完整单元测试套件、类型检查、lint 和生产构建；验证生成的 worker 和离线预缓存条目。
- [x] 5.3 检查最终 diff，并保留与本次任务无关的既有工作区改动。
