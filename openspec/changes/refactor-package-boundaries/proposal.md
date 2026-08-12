## Why

当前目录已经按 `app`、`auth`、`db`、`trpc`、`ui`、`observability` 和 `security` 分区，但底层模块仍反向依赖 tRPC 传输层，通用 UI 也反向依赖具体页面；新增的认证审计逻辑还使 Route Handler 直接承担数据库和业务编排。现在修正依赖方向可以降低认证、安全和管理页面继续演进时的耦合风险，同时保持全部外部行为不变。

## What Changes

- 新增稳定的领域契约目录，承载用户等级、用户状态等跨 DB/Auth/tRPC/UI 使用的类型。
- 下沉通用 I18n 值契约与基础校验，消除 DB 对 tRPC I18n Schema 的反向依赖。
- 抽离 HTTP 请求元数据解析，使 Auth 和 middleware 不再依赖 tRPC 限流模块。
- 将认证审计、登录历史查询和 Better Auth hook 编排移入 `packages/auth/server`，让 Route Handler 只负责 HTTP 适配。
- 拆分 OAuth provider 的共享定义与服务端环境配置，保持客户端模块不接触服务端环境读取。
- 通过依赖注入解除 Tiptap 通用 UI 对 `app/admin` 媒体选择器的反向引用。
- 使用 AST 解析完整 import declaration，确保多行导入不能绕过包边界测试。
- 保持现有 URL、Better Auth 行为、tRPC 契约、页面文案和数据库结构不变。

## Capabilities

### New Capabilities

- `package-boundaries`: 定义 App Router、领域契约、认证服务、数据库、tRPC、UI、可观测性和安全模块之间的允许依赖方向及薄适配层要求。

### Modified Capabilities

无。

## Impact

- 影响 `src/app/api`、`src/auth.ts`、`src/middleware.ts`、`src/packages/auth`、`src/packages/db`、`src/packages/trpc` 和 `src/packages/ui/extended/Tiptap`。
- 不改变公开 API 路径、请求响应格式、数据库 schema、认证提供商配置或用户可见交互。
- 新增依赖边界测试，防止 Auth/DB/UI 再次反向引用 tRPC 或 App 层，并覆盖多行 import declaration。
