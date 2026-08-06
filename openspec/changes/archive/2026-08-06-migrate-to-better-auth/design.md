## Context

项目使用 Next.js 16 App Router、Turso/libSQL 和 Drizzle。现有认证由 NextAuth v5 beta 提供：使用 JWT session、现有 `user` 表保存业务用户和 bcrypt 密码，后台前端通过 `SessionProvider` 使用认证客户端，tRPC context 通过服务端 `auth()` 获取 session。

迁移必须避免改变业务用户 ID、文章作者关系、用户等级和用户状态。认证入口同时需要支持现有用户名密码、Turnstile、Google、GitHub 和 Apple。

## Goals / Non-Goals

**Goals:**

- 迁移到 Better Auth 的服务端和 React 客户端 API。
- 保留现有用户和 bcrypt 密码，支持用户名登录。
- 使用 Better Auth 的账号和数据库 session 模型。
- 继续以业务 `user.status` 和 `user.level` 做最终授权判断。
- 通过可重复执行的数据库迁移完成上线前数据准备。

**Non-Goals:**

- 本次不增加注册、邮箱验证、Passkey、2FA、组织或 API Key 能力。
- 本次不做 NextAuth Cookie 无感迁移。
- 本次不重构现有用户、文章和权限业务模块。

## Decisions

### 使用 Better Auth username 插件

使用 Better Auth 的 `emailAndPassword` 加 `username` 插件，让现有用户名登录映射到 `signIn.username`，而不是编写一套自定义密码认证协议。现有 `user.name` 保留为业务显示名；新增或映射 `username` 与 `displayUsername` 字段，迁移时以原用户名初始化两者。

备选方案是保留自定义登录 Route Handler 并手动创建 Better Auth session。该方案会绕开 Better Auth 的标准 credential 流程，后续插件兼容性和安全维护成本更高，因此不采用。

### 使用 Better Auth Drizzle 适配器和数据库 session

认证实例使用现有 Drizzle 数据库连接和 SQLite 方言，增加 Better Auth 所需的 `account`、`session`、`verification` 表，并将现有 `user` 表作为用户模型进行字段映射。数据库 session 便于在 tRPC 和服务端组件中通过请求 Cookie 获取有效会话，也使登出和会话撤销明确可控。

备选方案是继续使用无数据库 session。该方案无法自然承接旧密码到 Better Auth account 的迁移，也不利于后续撤销会话，因此不采用。

### Turnstile 放在登录前置校验层

保留现有登录页提交的 `captchaToken`，在调用 Better Auth `signIn.username` 前通过服务端 action/Route Handler 校验 Turnstile。Better Auth 标准用户名登录只负责凭据验证，不把 Turnstile token 作为密码账号字段存储。

### OAuth 用户采用邮箱匹配和业务字段保护

启用 Google、GitHub、Apple social providers。OAuth 登录成功后通过 Better Auth 的账号关联能力匹配现有邮箱；业务 `level`、`status` 不从 OAuth profile 覆盖。缺少邮箱或已禁用的用户不得创建或建立可用会话。

### 前端使用 Better Auth React client

新增 `auth-client.ts`，由 `createAuthClient` 提供登录、登出和 session 状态。管理后台移除 `SessionProvider`、`getProviders` 和 NextAuth client imports；OAuth provider 列表改为服务端配置的静态安全映射，避免暴露 client secret。

## Risks / Trade-offs

- [旧 Cookie 失效] → 发布说明明确要求重新登录；迁移前保留 NextAuth 代码备份，出现问题时可回滚部署。
- [现有用户表字段与 Better Auth schema 不完全一致] → 先通过生成 migration 和类型检查确认字段映射，再在测试数据库执行迁移。
- [Turso/libSQL 和 Cloudflare 运行时兼容性] → 同时运行单元测试、Next.js build 和 OpenNext Cloudflare build；不在未验证前删除旧依赖。
- [OAuth 自动账号关联策略差异] → 测试已存在邮箱用户、未验证邮箱和禁用用户三种情况，明确只允许安全匹配。
- [Better Auth 依赖版本变化] → 锁定安装版本并避免使用 beta API；将认证实例集中在单个模块。

## Migration Plan

1. 新增依赖、认证 schema、Better Auth 服务端实例和客户端，先让测试覆盖新接口。
2. 生成并审核 Drizzle migration，创建认证表和 username 字段。
3. 编写幂等数据迁移，把现有有密码用户写入 credential account。
4. 切换 Route Handler、后台登录/登出和 tRPC session 读取。
5. 运行类型检查、单元测试、构建和 Cloudflare 构建。
6. 部署数据库 migration 后再部署应用，通知用户重新登录。

回滚时回退应用版本并保留新增认证表；由于本次不删除旧用户密码和业务字段，旧 NextAuth 代码仍可在回滚版本中读取原数据。

## Open Questions

无。迁移策略已确定为一次切换并要求用户重新登录。
