## Why

项目已不再以 Cloudflare 作为部署目标，但仓库仍保留 OpenNext、Wrangler 和 Cloudflare 构建脚本。这些部署侧遗留会误导维护者并增加不再使用的供应链依赖。

## What Changes

- 移除 OpenNext、Wrangler 和 Cloudflare 构建/部署脚本。
- 移除仅服务于 Cloudflare 部署的适配器依赖与测试。
- 保留 Cloudflare R2、Turnstile、Analytics、CSP 及相关环境变量的运行时行为。

## Capabilities

### New Capabilities

- `cloudflare-deployment-removal`: 定义不再支持 Cloudflare 部署、但保留 Cloudflare 运行时服务集成的工程基线。

### Modified Capabilities



## Impact

受影响范围包括部署脚本、OpenNext 配置、Cloudflare 适配器依赖、CI 文档与仅验证 Cloudflare 构建的测试。运行时服务集成不在本次变更范围内。
