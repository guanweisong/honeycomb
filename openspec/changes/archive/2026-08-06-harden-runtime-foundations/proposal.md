## Why

当前生产构建会在生成 sitemap 时直接访问远程数据库，外部服务不可用即可阻断发布；同时环境变量、响应安全策略和服务端模块边界缺少统一且可验证的约束。需要先建立可靠的运行时基础，降低配置错误、构建耦合和服务端代码误入客户端的风险。

## What Changes

- 将动态 sitemap 从构建期数据库查询改为运行时按需生成、缓存和可降级读取，并支持内容规模增长后的 sitemap 分片。
- 使用类型化 Schema 区分服务端、客户端和可选集成环境变量，在生产启动阶段统一校验且不泄露变量值。
- 增加可按环境配置的 CSP 及 HSTS、内容类型、来源、权限和防嵌入等安全响应头。
- 为数据库、认证、tRPC 服务、邮件、对象存储、验证码、缓存等服务端入口增加 `server-only` 边界。
- 增加针对构建脱离数据库、配置失败、安全响应头和服务端边界的自动化验证。

## Capabilities

### New Capabilities

- `runtime-sitemap`: 规定 sitemap 的运行时生成、缓存、降级和分片行为。
- `runtime-environment-validation`: 规定环境变量分类、生产启动校验和安全错误报告。
- `response-security-policy`: 规定 CSP 和通用安全响应头的环境化策略。

### Modified Capabilities

- `module-boundaries`: 增加服务端专属模块必须通过 `server-only` 阻止客户端导入的要求。

## Impact

- 影响 `src/app/sitemap.ts`、`src/instrumentation.ts`、`next.config.ts`、Proxy、安全配置和环境变量访问入口。
- 影响数据库、认证、tRPC API、邮件、R2/S3、Turnstile、Upstash 等服务端模块。
- 生产部署需要提供通过 Schema 校验的核心环境变量；可选集成仅在启用时要求完整配置。
- 构建流程不再要求 Turso 在预渲染阶段可访问。
