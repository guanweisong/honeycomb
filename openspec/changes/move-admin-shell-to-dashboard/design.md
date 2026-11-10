## Context

`src/app/admin/components/AdminLayout` 与 `AdminNavigation` 只有受保护 dashboard 的生产消费者。dashboard 的认证 layout 使用 `AdminClientShell`，文章和页面编辑器使用 `AdminPageHeader`。Admin 根 layout、登录页和 forbidden 页不使用这些组件。当前 header context 的路径约定来自较早的模块归属变更，与现有消费者不一致。

Next.js route group `(dashboard)` 不进入 URL。把 dashboard 专属共用 UI 放进该组的 `components` 不改变路由地址或认证 layout。

## Goals / Non-Goals

**Goals:**

- 将 AdminLayout、侧栏、用户菜单、导航项、导航组件、菜单标题与头部 context 及其既有测试迁入 dashboard 根 `components`。
- 将仅服务 dashboard shell 的菜单配置及其测试迁入 dashboard `config`。
- 更新所有代码、测试 mock、目录约定和当前导航，使 dashboard UI 的所有权与消费者一致。
- 保留模块导出、客户端边界、组件行为、认证/Provider 顺序及所有 URL。

**Non-Goals:**

- 不调整 AdminClientShell、页面壳或 shell 交互行为。
- 不移动登录页、根 admin layout、route capability 配置或通用 UI。
- 不保留旧路径兼容出口，不改权限策略。

## Decisions

1. **整体移动 shell 子树。** 将 `AdminLayout/**` 和 `AdminNavigation/**` 连同测试迁到 `src/app/admin/(dashboard)/components`，保留原子目录层级。只移动 Navigation 而留下 Layout/context 会制造父目录与子路由组之间的反向依赖，也会使同一 shell 分散。
2. **菜单数据随唯一消费者迁移。** 将 `src/app/admin/constants/menu-data.tsx` 及测试迁到 `(dashboard)/config`。该模块只被 `AdminClientShell` 用于渲染 shell；`route-capabilities` 继续留在根 admin constants，因为 dashboard template 也消费它。
3. **保持客户端和接口契约。** 原有 `use client` 指令、导出符号、样式、资源、行为测试及权限过滤保持。同步更新生产导入、测试导入和 mock 后删除旧目录。
4. **新约定替代旧路径要求。** 在 `package-layer-architecture` 增加 dashboard shell 所有权要求；在当前架构索引和目录模板中指向新规则。旧模块归属变更保留其历史设计，但加注说明该路径决策已由本变更取代。

## Risks / Trade-offs

- **导入或 mock 遗漏导致测试/类型检查失败** → 对旧模块名、旧绝对路径和新目录进行完整源码及测试扫描；不保留转发层。
- **文件移动误改 client 边界或行为** → 除导入路径外保持实现与测试内容不变，比较移动前后的 `use client` 指令和导出。
- **新旧规范继续冲突** → 更新架构规则索引和目录模板，并在旧增量规范顶部标记 superseding change。

## Migration Plan

1. 按映射移动组件树及测试，移动菜单数据和测试，更新全部消费者与 mock。
2. 更新 OpenSpec 当前需求、架构索引、目录模板、阅读地图及旧决策的 superseded 注记。
3. 静态复核路径、文件清单、导出、client 指令和 diff。无需迁移数据；回退可整体恢复旧路径。

## Open Questions

无。用户已选择整体移动并更新约定。
