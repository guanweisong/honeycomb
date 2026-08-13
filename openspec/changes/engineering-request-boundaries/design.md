## 总体架构

服务端请求分为三层。Server Component 优先调用 DAL；需要复用已有业务 procedure 时，调用带 headers 的 server tRPC caller。Client Component 使用 tRPC React 处理业务查询和 mutation，使用 Better Auth client 处理认证协议，文件上传使用 presigned URL 直接发送到 R2。

## 服务端 caller

`createServerClient` 接收可选的 `Headers`，并将其传入 `createContext`。未传 headers 时仅作为公开数据兼容入口，不应被用于鉴权 procedure。新增测试验证 headers 中的 session cookie 能够到达 `auth.api.getSession`。

## DAL

保留并整理 `getAdminUser(headers)` 作为后台认证入口；新增 `getSiteSetting()` 作为公开站点设置读取入口。DAL 内部可以使用数据库服务或带请求上下文的 server caller，但调用方不再自行拼接认证和设置查询。

## 请求入口规则

- tRPC：业务数据、业务 mutation、权限校验。
- Better Auth：登录、登出、Passkey、密码、会话和账号关联。
- fetch：R2 文件直传、外部服务验证和浏览器专属请求。
- Route Handler：协议适配，不复制业务逻辑。

## 迁移范围

第一批迁移 admin login、dashboard、setting，以及 blog 和 sitemap 中的 Server Component caller。客户端页面和 Better Auth 账户安全页面不在本次重写范围内。

## 风险控制

- 先增加失败测试，再修改 caller/context。
- 不改变 procedure 的鉴权规则。
- 保留公开 procedure 的既有行为。
- 完成后运行全量单元测试、类型检查、OpenSpec 校验和生产构建。
