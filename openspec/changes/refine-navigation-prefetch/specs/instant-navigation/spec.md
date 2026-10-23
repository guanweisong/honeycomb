## MODIFIED Requirements

### Requirement: 博客站内链接完整预取目标内容

博客共享站内链接 MUST 默认使用prefetch=true以预取目标URL缓存内容，同时 MUST 保留调用方显式指定的false、auto或null。密集标签与搜索结果 SHALL 使用auto以复用路由壳；文章主要入口、菜单和语言切换 MUST 保留原策略。后台导航链接 MUST 保留auto；单条已授权详情的意图数据预取不等于强制完整路由预取，MUST NOT 绕过服务器权限。实时评论 MUST 保持独立动态读取。

#### Scenario: 默认博客站内链接进入视口

- **WHEN** 生产环境中未覆盖策略的博客站内链接变为可见
- **THEN** Next.js预取目标URL的缓存内容

#### Scenario: 密集次要链接显式使用auto

- **WHEN** 标签或搜索结果渲染带auto的共享链接
- **THEN** 封装保留auto并由框架预取路由壳，不覆写成true

#### Scenario: 调用方禁用预取

- **WHEN** 调用方显式传递false或null
- **THEN** 封装原样保留该值而非回落为true

#### Scenario: 后台菜单链接进入视口

- **WHEN** 已认证用户看到后台菜单链接
- **THEN** 链接按auto预取页面外壳，不强制完整预取私有路由数据
