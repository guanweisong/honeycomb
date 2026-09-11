# Admin 正文区域加载

## Purpose

定义 admin dashboard 菜单导航期间的后台壳、已有正文和轻量导航反馈，避免动态路由等待用整块 fallback 替换可继续阅读的内容。

## Requirements

### Requirement: 后台壳在菜单导航期间保持稳定

admin dashboard 在菜单导航等待期间 SHALL 保留侧边栏、顶部栏和页脚，不得使用路由级 fallback 替换整个后台壳。

#### Scenario: 生产环境切换菜单

- **WHEN** 用户从一个 admin 页面点击另一个菜单项且目标 RSC 尚未返回
- **THEN** 侧边栏、顶部栏和当前正文继续显示，目标菜单项显示导航加载反馈

### Requirement: 已有正文不被路由级 loading 替换

admin dashboard SHALL 在目标 RSC 尚未返回时保留当前正文，不得通过 dashboard 公共 `loading.tsx` 将正文替换为整块加载状态；首次数据读取继续由各业务页面的局部查询状态负责。

#### Scenario: 返回已访问页面

- **WHEN** 用户返回已访问的 admin 页面且目标 RSC 尚未返回
- **THEN** 当前正文保持可见，目标菜单项显示 pending 状态，仍在查询缓存中的业务数据在目标页面挂载后立即可用

#### Scenario: 目标页面加载完成

- **WHEN** 菜单导航完成并渲染目标页面
- **THEN** 正文区域显示目标页面内容且目标菜单项不再显示 pending 状态

### Requirement: Admin 菜单不预取私有动态路由

admin 菜单 SHALL 禁用默认 Link 预取，避免为所有可见菜单批量请求只包含路由 loading 壳的私有 RSC payload。

#### Scenario: 展示后台菜单

- **WHEN** admin dashboard 渲染用户可访问的菜单项
- **THEN** 菜单不因项目进入视口而批量预取对应的私有动态路由

### Requirement: 已访问动态路由复用客户端 RSC

系统 SHALL 在浏览器内存中保留已访问动态路由的 RSC segment 五分钟，使用户在该时限内返回 Admin 页面时无需再次发送对应的路由 RSC 请求。该缓存不得持久化到服务端或跨越页面硬刷新；登出和认证失效 MUST 通过硬导航离开后台，使当前登录会话的客户端 Router Cache 被销毁。

#### Scenario: 五分钟内返回已访问页面

- **WHEN** 用户在首次完成 Admin 路由 B 后切换到路由 A，并在五分钟内再次进入路由 B
- **THEN** 客户端直接复用路由 B 的 RSC segment，不发送新的路由 B RSC 请求

#### Scenario: 用户退出后台

- **WHEN** 用户登出或客户端检测到认证失效
- **THEN** 浏览器硬导航到登录页，不允许当前登录会话的私有 Router Cache 被后续会话复用

### Requirement: 菜单导航 API 保持兼容

菜单组件 SHALL 支持 admin 提供的导航回调，同时在未提供回调时保持现有 `Link` 导航行为。

#### Scenario: 普通菜单调用方

- **WHEN** 菜单组件未收到自定义导航回调
- **THEN** 菜单项继续使用默认链接导航

### Requirement: 后台公共 Provider 只持有全局消费者

admin dashboard 公共 Provider SHALL 只包含所有后台页面共同需要的认证、站点设置、tRPC 和查询缓存能力；媒体选择器和编辑器专属 Provider MUST 下沉到内容编辑路由。

#### Scenario: 访问普通后台列表

- **WHEN** 用户访问评论、用户、设置或链接列表
- **THEN** 公共布局不初始化文章编辑器媒体选择能力

#### Scenario: 访问文章或页面编辑器

- **WHEN** 用户进入需要富文本媒体选择的编辑路由
- **THEN** 路由局部 Provider 提供既有选图能力
