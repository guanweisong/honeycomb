## Why

当前项目使用 NextAuth v5 beta，认证实现依赖 beta API，并将用户名密码、OAuth 同步、Turnstile 校验和业务权限逻辑分散在多个层次。迁移到 Better Auth 可以获得更完整的认证数据模型和后续扩展空间，同时保留现有业务用户与权限数据。

## What Changes

- 新增 Better Auth 服务端实例、Next.js Route Handler 和浏览器客户端。
- 将现有用户名密码登录、Turnstile 校验和 Google/GitHub/Apple OAuth 迁移到 Better Auth。
- 为现有用户增加 Better Auth 的账号、会话和验证数据模型。
- 将现有 bcrypt 密码迁移为 Better Auth credential account，保留用户 ID、用户名、等级、状态和业务数据。
- 将 tRPC 服务端会话读取和管理后台登录/登出流程切换到 Better Auth。
- **BREAKING**：旧 NextAuth Cookie 不再兼容，迁移发布后用户需要重新登录。
- **BREAKING**：移除 NextAuth 依赖及其客户端类型扩展。

## Capabilities

### New Capabilities

- `better-authentication`: 提供用户名密码、Turnstile、OAuth 登录、会话管理和登出能力。

### Modified Capabilities

无。当前 `openspec/specs/` 中没有认证能力规范，本次新增认证能力规范。

## Impact

- 影响 `src/auth.ts`、认证 Route Handler、管理后台登录/登出页面、Admin `SessionProvider` 和 tRPC context。
- 影响 Drizzle 数据库 schema 与 migration，需要新增 Better Auth 的认证表并迁移现有密码账号。
- 影响环境变量命名、OAuth 回调地址、测试 mock、README 和依赖清单。
- 需要验证 Turso/libSQL、Drizzle、Next.js 16 和 OpenNext/Cloudflare 构建兼容性。
