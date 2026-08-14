## Why

生产环境切换 admin 菜单时，dashboard 路由级 `loading.tsx` 会替换正文区域，即使用户已经访问过页面也会重复看到“正在加载”。这让后台操作产生明显的闪烁和等待感。

## What Changes

- 将 admin dashboard 的加载反馈从路由段级别调整为正文区域级别。
- 切换菜单时保留后台壳、侧边栏、顶部栏和页脚。
- 复用现有页面和 TanStack Query 的局部加载状态，不改变认证和业务数据请求语义。
- 为导航加载行为补充可验证的组件测试。

## Capabilities

### New Capabilities

- `admin-content-loading`: admin 菜单导航期间保持后台壳稳定，并在正文区域提供加载反馈。

### Modified Capabilities

## Impact

- 影响 `src/app/admin/(root)/(dashboard)` 的路由加载边界和 admin 布局组合。
- 不新增依赖，不修改 API、权限校验或数据库逻辑。
- 需要更新相关单元测试，并执行类型检查、Lint 和生产构建验证。
