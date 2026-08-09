## Why

现有后台只能使用用户名密码或 OAuth 登录，缺少基于设备生物识别、PIN 或安全密钥的抗钓鱼认证方式。Passkey 作为补充登录方式，可以提升后台登录安全性，同时不影响现有账号和密码登录流程。

## What Changes

- 接入 Better Auth 官方 Passkey 插件和客户端插件。
- 新增 Passkey 凭据数据表及数据库迁移。
- 已登录用户可在个人安全设置中注册、重命名和删除自己的 Passkey。
- 登录页新增 Passkey 登录入口，并保留用户名密码和 OAuth 登录。
- Passkey 登录继续执行现有用户状态检查，禁用用户不能建立会话。
- 将 WebAuthn RP ID 和 Origin 固定为生产站点配置，并支持本地开发配置。

## Capabilities

### New Capabilities

- `passkey-authentication`: 提供 Passkey 注册、管理和登录能力。

### Modified Capabilities

无。Passkey 作为新增认证方式，不改变现有用户名密码、OAuth 和会话行为。

## Impact

- 影响 `src/auth.ts`、`src/auth-client.ts` 和 Better Auth 认证 Route Handler。
- 影响 Drizzle schema 及生产数据库，需要新增 `passkey` 表。
- 新增个人安全设置页面和登录页交互。
- 新增 `@better-auth/passkey` 依赖及相关测试。
