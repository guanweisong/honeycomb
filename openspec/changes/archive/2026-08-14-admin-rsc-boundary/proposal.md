## 为什么

当前 `app/admin` 的根布局、认证守卫和 dashboard 布局全部是 Client Component，导致后台首屏认证、菜单和站点信息依赖浏览器请求，并产生加载闪烁。需要利用 React Server Components 将服务端职责前移，同时保留表格、表单、上传和编辑器等必要的客户端交互。

## 变更内容

- 将 admin 根布局改为 Server Component。
- 新增客户端 Provider 容器，仅承载 tRPC、React Query、Tiptap 媒体选择器和通知等浏览器依赖。
- 使用独立的服务端认证函数读取 Better Auth 会话。
- 将 `/admin`、登录守卫和 dashboard 壳层的重定向与首屏数据读取迁移到服务端。
- 保留现有客户端 tRPC 查询、mutation、DataTable、Dialog、上传和编辑器边界。

## 能力

### 新增能力

- `admin-server-rendering`: 后台路由的服务端认证、重定向和壳层渲染。

### 修改能力

无。

## 影响范围

- 影响 `src/app/admin` 的根布局、认证布局和 dashboard 布局。
- 新增服务端认证测试与布局相关回归测试。
- 不新增依赖，不改变 tRPC API 协议和权限规则。
