## Why

刷新已发布文章时，Header 和 Footer 先显示，正文随后才出现并撑开页面，造成明显跳动。虽然详情路由已生成静态参数，线上构建仍报告共享客户端组件在 Suspense 外读取 URL 参数，阻止详情路由完整预渲染。

## What Changes

- 让公开 Header、Footer 使用可缓存的设置和菜单数据，避免无必要的请求时渲染。
- 隔离共享导航中依赖 URL 参数的客户端部分，使它们不阻塞详情路由预渲染。
- 保证已发布文章和独立页面的首屏响应同时包含共享头尾和正文；保留文章猜你喜欢完整预取与评论独立加载。
- 增加生产浏览器回归验证，覆盖直接刷新和目标 URL 预取。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `instant-navigation`：已发布详情直接刷新时，共享布局和正文需一起预渲染并显示；未枚举 ID 仍可运行时解析。

## Impact

- 影响 Blog Header、Footer、菜单/面包屑、公开布局缓存及文章/页面详情路由。
- 更新即时导航规格与 `tests/e2e/blog/content-prefetch.spec.ts`。
- 不改变公开 URL、评论独立加载和猜你喜欢完整文章预取契约。
