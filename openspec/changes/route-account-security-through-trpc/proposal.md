## Why

账号安全页当前只有登录历史使用独立的 Next.js Route Handler，其余站内业务数据主要通过 tRPC 访问，造成客户端请求、鉴权和错误处理方式不一致。将自定义账号安全查询接入 tRPC，可复用现有 session context、权限 procedure 与类型推导，同时保留 Better Auth 的协议接口边界。

## What Changes

- 新增 `accountSecurity.loginHistory` tRPC query，仅返回当前已登录用户最近 50 条登录历史。
- 登录历史响应显式输出 JSON 兼容的 ISO 时间字符串。
- 登录历史页面改用项目现有 tRPC React Query 客户端及统一错误提示。
- 删除 `/api/account/security/login-history` 原生 Route Handler 及其专用测试。
- 新增中立的 `packages/account-security` 领域包，承载登录历史模型、repository 与保留策略，供 Auth 写入、tRPC 查询。
- Auth 仅保留 Better Auth 事件识别、hooks 和请求审计编排，不再拥有通用登录历史数据能力。
- Better Auth 的 Passkey、密码、会话、OAuth 关联接口继续由 `authClient` 直接调用，不包装为 tRPC procedure。

## Capabilities

### New Capabilities

- `account-security-trpc-api`: 约束站内自定义账号安全查询通过 tRPC 暴露，并保持 Better Auth 协议接口独立。

### Modified Capabilities

无。

## Impact

- 影响账号安全页登录历史组件、tRPC `appRouter`、新增账号安全 router，以及登录历史模型与 repository 的包路径。
- 移除一个 Next.js 原生 API 路由，不改变账号安全页的用户可见行为或数据库结构。
- Better Auth catch-all 路由、认证 hooks、Passkey、密码、会话与账号关联调用不受影响。
