## Context

admin dashboard 的 `loading.tsx` 位于所有 dashboard 页面共享的路由段下。生产环境动态 RSC 导航每次切换都可能触发该 fallback，当前 fallback 直接渲染全宽 `main`，导致正文内容被完全替换。`DashboardClientShell` 已经稳定提供后台壳，但它位于 dashboard layout 的 children 外层，不能阻止子路由 loading 替换 children。

## Goals / Non-Goals

**Goals:**

- 导航等待期间始终保留侧边栏和后台顶部结构。
- loading 反馈只出现在正文内容容器内。
- 保持现有服务端认证、站点配置获取和页面数据请求不变。

**Non-Goals:**

- 不改变 Next.js Router Cache、动态渲染或服务端缓存策略。
- 不将所有后台页面重构为客户端单页应用。
- 不替换各业务页面已有的查询 loading、错误和空状态。

## Decisions

- 在 `DashboardClientShell` 内新增客户端导航 pending 状态，并用 `useTransition` 包裹菜单导航，使壳组件能够保留旧 children，同时在正文层叠加轻量 loading 状态。
- 菜单导航通过 admin 布局上下文传递导航函数，避免通用 `Menu` 组件依赖 admin 路由或业务状态。
- 移除 dashboard 目录级 `loading.tsx`，避免 Next.js Suspense 在路由切换期间卸载正文 children；正文 loading 由 admin 壳统一管理，页面内部查询 loading 继续保留。

替代方案：仅删除 `loading.tsx` 会让导航等待期间正文保持旧内容但没有反馈；继续使用路由级 loading 会复现当前生产问题，因此不采用。

## Risks / Trade-offs

- [风险] 快速连续点击可能产生多个导航请求 → 导航函数在 pending 期间禁用重复触发或由 Next.js 中断前一个导航。
- [风险] 旧正文在新页面返回前仍可见 → loading 遮罩明确标记正文正在切换，避免用户误操作。
- [风险] 菜单组件 API 变化影响其他调用方 → 仅通过可选的导航回调扩展 API，默认行为保持原样。

## Migration Plan

先新增导航 pending 能力和测试，再删除 dashboard 级 loading，执行相关测试、类型检查、Lint 和生产构建。若出现回归，可恢复 `loading.tsx` 并移除 pending 导航回调。
