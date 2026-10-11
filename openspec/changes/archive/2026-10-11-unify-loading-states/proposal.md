## Why

Blog 和 admin 已有共享的 `LoadingState`，但部分非骨架加载仍由独立文本、旋转图标或 Admin 专用 fallback 展示，造成跨页面的反馈样式与无障碍语义不一致。统一这些状态可以让用户在路由、局部内容和操作等待期间获得一致反馈，同时保留现有骨架屏布局。

## What Changes

- 让 blog 和 admin 中所有非骨架 loading 反馈使用共享 `LoadingState`，覆盖路由与 Suspense fallback、局部查询、列表增量加载、动态模块以及当前显示加载文本或图标的操作状态。
- 扩展 `LoadingState` 以适配整页、区域和行内场景，并保持对应场景的布局与语义。
- 移除重复的 Admin 路由 fallback 实现；统一菜单导航、表格、媒体、文章列表等独立 loading 提示。
- 保持现有骨架屏组件、占位结构和展示方式不变。
- 保持现有查询、导航、提交和禁用逻辑不变，只调整加载反馈的呈现组件。

## Capabilities

### New Capabilities
- `loading-state-presentation`: 约束 blog 和 admin 非骨架加载反馈统一使用共享 `LoadingState`，并保留场景适配能力与现有骨架屏。

### Modified Capabilities

## Impact

- 共享 UI：`src/packages/ui/extended/LoadingState`。
- Admin：路由 fallback、菜单、数据表格、媒体管理、文章标签和表单/弹层操作状态。
- Blog：文章列表增量加载及现有异步区域 fallback。
- 不新增依赖，不改变业务数据流或服务端接口。
