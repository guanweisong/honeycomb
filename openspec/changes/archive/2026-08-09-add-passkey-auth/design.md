## Context

当前应用已经使用 Better Auth 处理用户名密码、OAuth 和会话，但安装的 Better Auth 核心包未包含 Passkey 插件。项目使用 Next.js App Router、Drizzle SQLite/Turso 适配器，认证请求统一通过 `/api/auth/[...all]` Route Handler 转发。

Passkey 属于 WebAuthn 认证，需要服务端保存公钥凭据、计数器和设备信息，并要求 RP ID 与实际部署域名一致。生产站点的认证正式来源为 `https://www.guanweisong.com`。

## Goals / Non-Goals

**Goals:**

- 以官方 `@better-auth/passkey` 插件接入 Passkey。
- 允许已登录用户管理自己的 Passkey。
- 在登录页提供 Passkey 登录，同时保留现有登录方式。
- 复用现有会话创建钩子，确保禁用用户不能通过 Passkey 登录。
- 通过可回滚的数据库迁移新增 Passkey 表。

**Non-Goals:**

- 不实现 Passkey-first 注册。
- 不删除用户名密码或 OAuth 登录。
- 不允许管理员绕过当前用户会话直接替他绑定 Passkey。
- 不实现跨站点或多租户 RP ID。

## Decisions

### 使用官方 Passkey 插件

使用 `@better-auth/passkey` 及其客户端插件，由 Better Auth 负责 WebAuthn challenge、验证、会话和凭据存储。自定义 SimpleWebAuthn 流程会重复实现安全协议，且难以与现有认证 Route Handler 和会话钩子保持一致，因此不采用。

### 仅允许认证后绑定

使用插件默认的 `registration.requireSession` 行为。安全设置页面必须已有有效会话，服务端也由插件再次校验会话，避免未认证用户通过公开注册接口绑定凭据。

### 固定生产 WebAuthn 来源

Passkey 使用 `rpID: "www.guanweisong.com"`、`origin: "https://www.guanweisong.com"`，本地开发使用 `localhost` 配置。根域名访问应由站点重定向到带 `www` 的正式来源，避免同一凭据在不同 RP ID 间产生歧义。

### 使用插件管理的 passkey 表

按官方字段创建 `passkey` 表，保存 `id`、`name`、`publicKey`、`userId`、`credentialID`、`counter`、`deviceType`、`backedUp`、`transports`、`createdAt` 和 `aaguid`。不把私钥或认证器敏感材料写入数据库。

### 管理界面放在个人安全设置

新增个人安全设置页面，使用客户端 API 完成列表、注册、重命名和删除。登录页只负责触发 `signIn.passkey`，成功后沿用现有 dashboard 跳转和用户刷新逻辑。

## Risks / Trade-offs

- [生产域名或 RP ID 配置不一致导致注册/登录失败] → 将 `AUTH_URL` 与 WebAuthn origin 统一为正式 `www` 域名，并增加配置测试。
- [旧浏览器不支持 WebAuthn] → 登录页检测 `window.PublicKeyCredential`，不支持时隐藏 Passkey 按钮并保留密码登录。
- [误删唯一 Passkey 后无法使用 Passkey 登录] → 页面明确保留密码登录，并要求用户在删除前至少保留一种可用认证方式。
- [数据库迁移未部署导致认证接口报错] → 先部署迁移，再部署启用插件的应用版本；回滚时先回滚应用代码，新增表可保留。
