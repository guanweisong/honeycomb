## Why

`AdminLayout`、导航和头部上下文的实际消费者都位于受保护的 `(dashboard)` 路由组，但代码和约定仍将它们放在 `src/app/admin/components`。这让组件归属与认证布局边界不一致，也要求 dashboard 从父级目录导入自己的 shell。

## What Changes

- 将 AdminLayout、AdminNavigation 及其测试迁入 `(dashboard)/components`，保留导出、客户端指令和交互行为。
- 将仅供 dashboard shell 使用的菜单数据和测试迁入 `(dashboard)/config`。
- 更新所有生产导入、测试导入及 mock；删除旧 `src/app/admin/components` 目录。
- 修订目录约定和组件归属文档，明确 dashboard shell 归 `(dashboard)`；把先前固定 header context 路径的说明标为已被后续决策取代。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `package-layer-architecture`：明确专属于受保护 dashboard 的共享 shell UI 和菜单配置归 dashboard 路由组。

## Impact

影响 `src/app/admin` 下的组件、菜单配置、现有组件测试和导入 mock，以及 OpenSpec、前端目录模板和代码阅读地图。Next.js 路由 URL、认证与授权流程、Provider 顺序、组件行为和依赖均不变。
