## Context

账号安全页包含两类请求：Better Auth 定义的认证协议操作，以及应用自行实现的登录历史查询。前者必须继续使用 Better Auth 客户端与 `/api/auth/*` 路由；后者当前通过单独的 `/api/account/security/login-history` Route Handler 获取，绕过了工程已经统一使用的 tRPC context、鉴权与客户端查询状态。

项目的 tRPC 未配置特殊 transformer，因此 Router 不应直接向客户端暴露 `Date` 类型，必须输出 JSON 兼容字符串。

## Goals / Non-Goals

**Goals:**

- 使用 tRPC 暴露当前用户登录历史查询。
- 复用 tRPC context 中的登录用户和数据库实例，保证只查询当前用户。
- 使用 tRPC React Query 管理登录历史加载、成功与失败状态。
- 删除不再需要的原生登录历史 Route Handler。

**Non-Goals:**

- 不将 Better Auth 的 Passkey、密码、Session、OAuth 关联协议包装为 tRPC。
- 不修改登录历史的数据表、记录机制、保留周期或最多 50 条规则。
- 不修改账号安全页的视觉结构和展示文案。

## Decisions

### 新建独立的账号安全 Router

新增 `accountSecurityRouter` 并以 `accountSecurity` 注册到 `appRouter`。登录历史属于当前用户的安全能力，不并入后台用户管理 `userRouter`，避免把“管理员管理用户”与“用户管理自己的账号安全”混为一体。

替代方案是把 query 添加到 `userRouter`。该方案文件更少，但会扩大已经承担用户 CRUD 的 router 职责，因此不采用。

### 通用登录历史能力归属账号安全领域包

新增 `packages/account-security`，存放登录历史输入模型、记录构建、repository、查询限制和保留策略。Better Auth hooks 与请求审计依赖该包写入记录；tRPC 账号安全 Router 依赖该包读取记录。

不把这些能力放入 `packages/trpc`，因为 Auth 写入流程不应依赖 API 传输层；也不继续放在 `packages/auth`，因为登录历史的读取、保留和数据模型并非 Better Auth 协议本身。依赖方向固定为 `Auth → Account Security ← tRPC`。

Better Auth 路径到认证方式、退出事件的映射仍属于 Auth，但重命名为认证事件分类器，避免把通用登录历史职责误归到 Auth。

### 认证协议继续直连 Better Auth

Passkey、密码、会话和账号关联继续调用 `authClient`。这些操作依赖 Better Auth 的固定请求格式、Cookie、OAuth 跳转和 WebAuthn 流程；增加 tRPC 包装只会形成重复接口，并可能破坏协议兼容性。

### 使用现有用户自身读取权限

登录历史 query 使用 `permissionProcedure(Permission.userReadSelf)`。它复用当前 tRPC session 与数据库状态复核，并确保 handler 执行时存在有效的 `ctx.user`。

### Router 显式序列化时间

Repository 保持返回数据库领域值，Router 将每条记录的 `createdAt` 转换为 ISO 字符串。这样运行时 JSON 与 TypeScript 推导一致，客户端无需接受表面为 `Date`、实际为字符串的类型偏差。

### 页面使用 tRPC 查询状态

`LoginHistorySettings` 使用 `trpc.accountSecurity.loginHistory.useQuery()`，以 `isPending` 展示现有 Skeleton，以 `data ?? []` 展示列表或空状态，并通过单次 effect 对 query error 提示 toast。

## Risks / Trade-offs

- [迁移后缓存与原生 fetch 行为不同] → 登录历史 query 使用默认 React Query 生命周期；该页面仅在打开时读取，不引入额外缓存策略。
- [错误提示可能因重复渲染多次出现] → effect 依赖稳定的 query error，并仅在 error 存在时提示。
- [删除旧路由会影响未知外部调用者] → 该接口是账号安全页内部接口且尚未形成公开契约；通过源码搜索和测试确认唯一消费者后删除。

## Migration Plan

1. 先添加失败的 tRPC Router 与页面调用测试。
2. 实现并注册 `accountSecurityRouter`，确认 query 只读取当前用户并序列化时间。
3. 切换页面到 tRPC hook，运行相关测试。
4. 删除旧 Route Handler 与测试，搜索确认没有遗留调用。
5. 将通用登录历史模型与 repository 迁入 `packages/account-security`，更新 Auth 与 tRPC 的依赖路径。
6. 运行类型检查、Lint、全量测试、生产构建与 OpenSpec 严格校验。

回滚时恢复原 Route Handler 和页面 fetch，移除 `accountSecurityRouter` 注册即可；无需回滚数据库。

## Open Questions

无。
