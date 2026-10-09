## MODIFIED Requirements

### Requirement: 后台菜单使用自适应路由预取

后台菜单 SHALL 使用 Link 的 `auto` 预取策略。启用 Partial Prefetching 后，Next.js 会为可见链接预取目标 App Shell；菜单 MUST NOT 强制完整预取认证后才可见的私有动态数据。

#### Scenario: 渲染后台菜单

- **WHEN** 后台 dashboard 渲染用户可访问的菜单项
- **THEN** Next.js 为可见目标预取共享 App Shell，身份与权限相关内容继续由请求时的服务端边界保护

#### Scenario: 返回访问过的页面

- **WHEN** 用户返回访问过的后台页面
- **THEN** 现有的五分钟客户端动态路由复用和登出时硬导航行为保持不变
