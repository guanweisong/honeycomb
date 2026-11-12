## MODIFIED Requirements

### Requirement: 每个面向用户的 App Router 目标都提供即时且安全的页面外壳

所有可通过客户端导航访问的公开博客和后台路由 MUST 渲染静态或缓存的页面外壳，以便导航时立即显示。对于构建时已发布并由详情路由生成的文章和独立页面，直接刷新时的首个预渲染输出 MUST 同时包含共享 Header、对应正文和 Footer；这些内容 MUST NOT 先以只有头尾的空壳显示，再由正文撑开布局。构建时未枚举的文章或页面 ID MUST 仍可在运行时解析；开发态 MAY 在未枚举参数和正文解析期间显示局部 Suspense fallback，生产环境的完整页面及 URL 预取响应 MUST 包含公开正文或 not-found 结果，后续请求可复用缓存。公开 Header/Footer 数据 MUST 使用可失效缓存，MUST NOT 仅为读取菜单、设置或展示年份而进入请求时渲染。依赖运行时参数的客户端导航组件 MUST 被限制在局部 Suspense 边界内，且不得阻塞已生成详情路径的预渲染。其他请求时 API、依赖路由的未缓存读取和授权检查 MUST 放在路由局部的 Suspense 边界后；文章详情页的猜你喜欢查询遵循下一 Requirement 所述例外。应用 MUST NOT 使用 `instant = false` 让路由避开即时导航验证。fallback MUST NOT 暴露后台私有内容或绕过授权。

#### Scenario: 刷新构建时已生成的公开详情

- **WHEN** 访客直接刷新构建时已生成的文章或独立页面 URL
- **THEN** 首个预渲染输出同时包含 Header、详情正文和 Footer，不先显示缺少正文的共享页面外壳

#### Scenario: 首次访问构建时未列出的公开详情 ID

- **WHEN** 访客直接刷新或导航访问构建时未生成的文章或页面 ID
- **THEN** 开发态路由可以通过局部 Suspense 解析 URL 参数；生产环境完整页面及 URL 预取响应包含详情正文或 not-found，后续访问复用缓存

#### Scenario: 后台页面的请求级检查尚未完成

- **WHEN** 后台目标页面在导航期间需要执行会话或能力检查
- **THEN** 检查访问权限期间显示不含敏感信息的 fallback，只有授权成功后才渲染受保护页面内容

#### Scenario: 当前用户没有访问后台目标页面的能力

- **WHEN** 请求级路由检查发现已认证用户无权访问目标页面
- **THEN** 使用现有的禁止访问重定向或页面，目标页面的受保护内容不得出现在页面外壳或 fallback 中
