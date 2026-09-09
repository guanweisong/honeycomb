## Why

后台账号写入入口没有复用 Better Auth 的密码下限，生产依赖审计也无法解析当前 Bun 1.3.3 的真实输出；同时 CI 只执行少量 E2E 文件并允许关键场景按数据状态跳过。这三处缺口使已有安全与质量声明无法由真实入口持续证明，需要一次性收紧契约和门禁。

## What Changes

- 建立后台账号写入与 Better Auth 共用的密码策略，服务端统一验证邮箱格式以及密码长度。
- 让生产依赖审计安全解析包含 ANSI、dotenv 提示和版本 banner 的 Bun JSON 输出，同时拒绝缺失或歧义结果。
- 为完整 Chromium E2E 提供确定性测试数据，让 CI 执行全部浏览器场景，并移除依赖运行时页面内容的条件跳过。
- 保持现有生产数据库 schema、tRPC 成功响应、角色权限和外部服务配置不变。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `better-authentication`：后台创建和更新凭据必须执行与认证配置一致的密码及邮箱校验。
- `dependency-supply-chain-hygiene`：生产审计必须兼容锁定 Bun 版本的实际 stdout，并对无法唯一解析的输出失败关闭。
- `admin-module-boundaries`：CI 必须使用确定性数据运行完整 Chromium E2E，关键浏览器契约不得因数据缺失而跳过。

## Impact

- 账号契约：`src/features/user`、`src/packages/identity/auth` 与 `src/auth.ts`。
- 审计工具：`scripts/audit-production-dependencies.ts` 及其测试。
- 浏览器门禁：Playwright 配置、E2E fixtures、相关场景及 GitHub Actions 工作流。
- 文档和 OpenSpec 主规格将在实现验证后同步；不新增运行时依赖。
