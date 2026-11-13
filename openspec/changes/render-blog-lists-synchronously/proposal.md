## Why

访客刷新博客列表时会先看到骨架，再等待列表数据流入；用户希望首屏同步显示，并保留构建预渲染。菜单中的分类路径以及当前有已发布文章的标签、作者路径都可以在构建时确定，应预渲染其首屏卡片；空标签、无公开文章的用户及构建后新增路径继续按请求解析。

## What Changes

- 构建时从公开菜单枚举分类列表 URL，并从已发布文章关系中读取轻量标签/作者 ID 投影；这些已知列表 URL 都预渲染包含公开首屏卡片的 HTML。
- 未枚举的列表 URL 按请求完成参数解析和公开列表读取后再渲染，不先显示列表骨架。
- 保留文章与分类列表的完整 URL 预取，导航继续复用预取到的公开卡片数据。
- 列表客户端交互在挂载后启用，预渲染及水合首屏直接使用服务端已取到的卡片数据。

## Capabilities

### New Capabilities

### Modified Capabilities

- `instant-navigation`：已发布内容关联的分类、标签和作者列表路径必须预渲染首屏卡片；未枚举列表路径同步等待请求数据，站内完整 URL 预取契约保持不变。
- `nextjs-runtime-performance`：在按 URL 生成时以轻量公开 ID 投影确定已知列表 URL 并预渲染；不得为移除列表 Suspense 而将这些路径改成动态 SSR。

## Impact

- `src/app/(blog)/[locale]/list/[...slug]/page.tsx` 的渲染边界和动态请求等待。
- `openspec/specs/instant-navigation/spec.md`、`openspec/specs/nextjs-runtime-performance/spec.md` 及生产 E2E 的列表刷新、RSC 预取验证。
- 空标签、没有已发布文章的作者及构建后新增列表 URL 仍在请求时等待数据；受缓存再验证影响，预渲染页面会按现有列表缓存策略更新。
