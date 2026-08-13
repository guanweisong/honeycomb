## Context

项目不再部署到 Cloudflare，但仍使用 Cloudflare R2、Turnstile 和 Analytics 等运行时服务。仓库中的 OpenNext、Wrangler 与专用构建脚本仅服务于已废弃的部署目标。

## Goals / Non-Goals

**Goals:**

- 删除 Cloudflare 部署适配器、配置、脚本和专用验证。
- 保持默认构建为 Next.js Turbopack。

**Non-Goals:**

- 不删除或修改 R2、Turnstile、Analytics、CSP、环境变量和媒体上传。
- 不改变其他部署平台或业务功能。

## Decisions

删除 `@opennextjs/cloudflare`、`open-next.config.ts`、`wrangler.jsonc` 与 Cloudflare 构建/部署脚本。保留 AWS S3 SDK、Turnstile 组件、R2 环境解析和 CSP 来源，因为它们属于运行时功能而不是部署适配器。

## Risks / Trade-offs

- [仍需 Cloudflare 部署] → 此变更是破坏性调整；应使用此前版本或另行恢复部署适配器。
- [误删运行时服务] → 类型检查与全仓检索确认 R2/Turnstile 相关模块仍存在。
