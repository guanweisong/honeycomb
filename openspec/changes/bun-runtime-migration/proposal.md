## Why

项目同时要求安装 Node.js 和 Bun，开发命令、CI 脚本与部署运行时的执行环境也不完全一致，增加了环境配置和故障排查成本。将项目工具链统一交给 Bun 执行，可以移除独立 Node.js 安装要求，并让本地、CI 与 Vercel 使用一致的运行时选择。

## What Changes

- 通过 Bun 执行 Next.js、测试、质量检查及其他项目 CLI，并固定本地和 CI 使用 Bun 1.4.4。
- 移除 Node.js engine 和 CI 的 Node 安装步骤；把仍直接调用 `node` 的脚本入口改为 Bun。
- 为 Vercel 配置 Bun runtime，并更新环境要求与原生模块运行说明。
- 保留 Next.js、第三方依赖及源码中的 `node:*` 兼容 API，不改变应用 API 和数据库行为。

## Capabilities

### New Capabilities

- `bun-runtime`: 定义项目工具、CI 与 Vercel 的 Bun runtime 约定。

### Modified Capabilities

无。

## Impact

影响 `package.json`、GitHub Actions 工作流、Vercel 配置、E2E 与 CI 辅助脚本、运行要求文档及既有质量工作流契约。应用 API、数据库 schema 和依赖版本保持不变；Vercel Bun runtime 与 Sharp 原生模块仍需在实际部署环境验证。
