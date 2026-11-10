## ADDED Requirements

### Requirement: Dashboard shell UI follows its protected route group

只服务受保护 dashboard 路由组的后台 shell、导航和头部投影 UI MUST 归属 `src/app/admin/(dashboard)/components`；仅供该 shell 使用的菜单数据 MUST 归属 `src/app/admin/(dashboard)/config`。这些模块及其测试 MUST 共置在 dashboard 路由组所属目录中，MUST NOT 继续放在 `src/app/admin/components`。Admin 根 layout、登录和其他路由专属 UI 仍归各自实际消费者；通用 UI 不因本要求迁入 dashboard。

#### Scenario: Dashboard shell and editors share the shell contract

- **WHEN** dashboard shell、文章编辑器或页面编辑器消费后台布局、导航或头部 context
- **THEN** 它们从 dashboard 路由组内的拥有者导入，且现有导出、客户端边界、渲染行为与测试契约保持不变

#### Scenario: Dashboard shell relocation preserves routes and access

- **WHEN** AdminLayout、AdminNavigation、头部 context 或菜单配置迁入 dashboard 路由组
- **THEN** 公开 URL、admin 根 layout、dashboard 认证与授权、Provider 顺序和导航权限过滤保持不变

#### Scenario: Non-dashboard admin routes remain independent

- **WHEN** 用户访问登录页、forbidden 页或 admin 根 layout
- **THEN** 这些路由不依赖 dashboard shell 组件，且本要求不把其 UI 移入 dashboard
