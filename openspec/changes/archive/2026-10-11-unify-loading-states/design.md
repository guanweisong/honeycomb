## Context

`src/packages/ui/extended/LoadingState` 已用于 blog、Admin 路由 fallback、评论区和菜单局部区域。Admin 认证与路由边界另有只显示文本的 `AdminRouteFallback`；数据表格、媒体列表、文章列表、动态模块和部分操作按钮还使用独立文本或 spinner。骨架屏则使用共享 `Skeleton` 组件并按图表、设置项和登录控件构造不同占位结构。

现有 `LoadingState` 只有整页和局部两种高度，但两种模式都渲染 `<main>`，且无法直接适配行内状态。Admin 当前规范要求导航期间保留后台壳与已有正文，并在目标菜单项显示 pending 反馈；这次调整只统一反馈呈现，保持该导航行为和查询/提交逻辑。

## Goals / Non-Goals

**Goals:**

- blog 与 admin 中所有非骨架 loading 提示均通过共享 `LoadingState` 呈现，包括 route/Suspense fallback、查询区域、增量加载、动态模块和当前明确显示 pending 文案或图标的操作状态。
- 让 `LoadingState` 能以页面、区域和行内形式呈现，使用适合所在位置的 HTML 语义、尺寸和间距。
- 保留每个状态当前适用的提示文案、数据状态逻辑、禁用行为和导航行为。
- 保持现有骨架屏及其占位结构和样式不变。

**Non-Goals:**

- 改造数据获取、缓存、导航、提交或错误处理逻辑。
- 统一骨架屏的形状、数量或动画。
- 添加新的 loading 动画风格或外部依赖。

## Decisions

### 由共享 LoadingState 提供页面、区域和行内模式

为 `LoadingState` 增加显式呈现模式：页面模式用于路由级 fallback，区域模式用于内容块，行内模式用于菜单项、按钮和列表尾部。模式负责合适的容器语义与布局；调用方通过 `label` 保留当前场景文案，并可提供布局类名以适配已有遮罩和对齐方式。更新现有调用点到显式模式，避免局部区域继续使用 `<main>`。

考虑过只用 CSS 类名区分尺寸。显式模式更容易检查语义与尺寸，也能直接表达按钮内和分页尾部的紧凑状态。保留 `LoadingState` 作为唯一通用 loading 入口，不再增加职责重叠的 spinner 包装组件。

### 将通用 fallback 和独立提示迁移到 LoadingState

Admin 登录页和 dashboard layout/template 的 fallback 直接使用 `LoadingState`，应用路由不再依赖 Admin 专用 fallback UI。`src/app/(blog)/loading.tsx`、`src/app/admin/loading.tsx` 也显式使用页面模式。菜单 pending、DataTable 遮罩、媒体初次/增量加载、文章列表增量加载、动态媒体选择器和当前显示 pending 文案或 spinner 的表单操作改用行内或区域模式。

保留反馈位置、文案、禁用状态及周边布局。DataTable 的遮罩仍由调用容器负责，`LoadingState` 只负责统一其内部提示。纯 disabled 状态且没有加载文案或图标的按钮不新增新的 loading 反馈。

### 骨架屏保持原有实现

Admin 登录 Passkey、安全设置和 dashboard 图表中的 `Skeleton` 结构保持原样。迁移时不把骨架状态替换成旋转提示，也不调整占位尺寸或动画。

### LoadingState 统一提供可访问状态

页面、区域和行内模式均保留上下文 `label`，向辅助技术提供一致的加载中状态；装饰性 spinner 对屏幕阅读器隐藏。页面与区域模式使用适当的 busy 状态，行内模式在需要时提供 status 语义，避免按钮内重复宣读整片内容。

## Risks / Trade-offs

- [Risk] 行内 loading 替换后可能改变菜单、表格遮罩和按钮的高度或对齐 → [Mitigation] 行内模式不设置最小块高度，并保留调用方外层布局类名；迁移时对照现有尺寸。
- [Risk] 某些英文或上下文相关提示在迁移中被默认中文覆盖 → [Mitigation] 每个调用点显式传递现有文案或已有翻译，不依赖全局默认值承载局部文案。
- [Risk] 使用单一组件可能让 aria 状态嵌套在带 busy 状态的区域内 → [Mitigation] 将 `aria-busy` 限定在正在加载的实际区域，行内模式只公告简短状态标签。

## Migration Plan

1. 扩展 `LoadingState` 的模式和可访问语义，并迁移它已有的页面/局部调用点。
2. 迁移 Admin route/Suspense fallback、菜单 pending、DataTable、媒体、文章列表、动态模块和操作中的非骨架 loading 提示。
3. 删除不再需要的 `AdminRouteFallback` 独立实现和本地 spinner/text loading 分支；保留数据状态和骨架屏。
4. 检查所有 blog/admin 可见的非骨架 loading 调用点，确认 fallback 和局部状态都由 `LoadingState` 呈现。

回滚时恢复对应调用点和 `LoadingState` 之前的 props；该变更不涉及持久化或接口迁移。

## Open Questions

无。范围已确认：骨架屏保持现状，其余 loading 使用 `LoadingState`，路由与 Suspense fallback 也包含在内。
