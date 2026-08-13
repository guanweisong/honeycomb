## ADDED Requirements

### Requirement: 后台服务端认证

后台认证布局 MUST 在服务端读取当前请求的 Better Auth 会话，并根据用户状态决定是否继续渲染。

#### 场景：有效用户访问 dashboard

- **当** 请求包含有效且启用的用户会话
- **则** dashboard 内容正常渲染

#### 场景：匿名用户访问 dashboard

- **当** 请求没有有效会话，或用户不存在、已禁用
- **则** 服务端重定向到 `/admin/login`

#### 场景：已登录用户访问登录页

- **当** 请求包含有效且启用的用户会话并访问 `/admin/login`
- **则** 服务端重定向到 `/admin/dashboard`

### Requirement: 后台客户端 Provider 隔离

admin 根布局 MUST 将仅浏览器可用的 tRPC、React Query、Tiptap 媒体选择器和通知 Provider 限制在独立的 Client Component 中。

#### 场景：服务端布局渲染

- **当** 任意 admin 路由进行服务端渲染
- **则** 根布局不依赖 React hooks、浏览器导航 API 或客户端 tRPC hooks

### Requirement: 后台入口重定向

`/admin` MUST 在服务端重定向到 `/admin/dashboard`，不得依赖客户端 effect 完成入口跳转。

#### 场景：访问后台入口

- **当** 用户访问 `/admin`
- **则** 服务端返回到 `/admin/dashboard` 的重定向

### Requirement: 登录页服务端数据准备

登录页 MUST 在服务端读取当前用户、站点设置、OAuth provider 和 `targetUrl`，客户端只负责登录交互。

#### 场景：匿名用户访问登录页

- **当** 请求没有有效后台会话
- **则** 服务端向客户端交互组件传递站点设置、provider 列表和目标地址

#### 场景：已登录用户访问登录页

- **当** 请求包含有效且启用的用户会话
- **则** 服务端重定向到 `/admin/dashboard`
