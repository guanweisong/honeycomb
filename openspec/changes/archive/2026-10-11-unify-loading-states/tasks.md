## 1. 扩展共享 LoadingState

- [x] 1.1 为 `LoadingState` 增加页面、区域和行内模式，提供适合各场景的容器语义、尺寸、上下文文案和无障碍状态。
- [x] 1.2 将现有 blog、评论和菜单中的 `LoadingState` 调用点迁移到显式呈现模式，并保持各处当前布局和文案。

## 2. 统一路由与局部 loading

- [x] 2.1 将 blog/Admin 路由 fallback、Admin 登录与 dashboard 的 Suspense fallback 全部接入 `LoadingState`，移除应用路径对独立 `AdminRouteFallback` UI 的依赖。
- [x] 2.2 将 Admin 菜单 pending、DataTable 查询遮罩、媒体初次/增量加载、文章列表增量加载、动态媒体选择器 fallback 和 MultiTag spinner 迁移到适配位置的 `LoadingState`。
- [x] 2.3 将 DynamicForm、Dialog、Sheet 和媒体上传等当前显示 pending 文案的操作反馈迁移到行内 `LoadingState`，保留禁用状态及已有标签。

## 3. 保持骨架屏并完成调用点盘点

- [x] 3.1 保持 Admin 登录、安全设置和 dashboard 图表的现有 `Skeleton` 组件、结构和样式。
- [x] 3.2 盘点 blog/Admin 剩余 loading 调用点，确认所有非骨架反馈均使用 `LoadingState`，且 Admin 导航期间仍保留后台壳与当前正文。
