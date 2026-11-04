## Context

仓库当前使用 Bun 安装依赖和运行部分 TypeScript 脚本，但 Next.js、测试与其他 CLI 可能由包管理器选择默认 runtime 启动；`package.json` 仍声明 Node.js engine，CI 也额外安装 Node.js。目标是让本地、CI 和 Vercel 生产进程统一使用 Bun，同时保持 Next.js 与第三方依赖的 Node 兼容接口。

约束包括：保持 Next.js、依赖版本、API、数据库 schema 和 Sharp 图片处理策略不变；本地与 CI 固定 Bun 1.4.4；Vercel 配置使用其支持的 Bun 主版本范围。项目已有 `node:*` 导入、`@types/node`、Next.js `nodejs` 标识和 Vitest `node` 环境，它们描述兼容接口或框架环境，不代表启动 Node 进程。

## Goals / Non-Goals

**Goals:**

- 使用 Bun 执行项目 CLI、CI 脚本和 Vercel 函数。
- 移除独立 Node.js 安装要求、Node engine 与脚本中的直接 Node 可执行调用。
- 保持现有 Next.js 功能、依赖和业务行为不变。

**Non-Goals:**

- 不逐一把 `node:*` API 改写为 Bun 专属 API。
- 不把 Vitest 迁移到 `bun:test`。
- 不迁离 Next.js 或 Vercel，不改数据库 schema、HTTP 契约或 Sharp 图片处理策略。

## Decisions

### 由 Bun 显式启动项目 CLI

为 Next.js、Vitest、ESLint、Prettier、Drizzle Kit、Husky、OpenSpec 和 Playwright CLI 使用 `bun run --bun` 或 `bunx --bun`；项目脚本中已经直接使用 Bun 的入口保持不变。这样可以避免包管理器选择 Node 启动 CLI。

### 本地和 CI 固定 Bun，Vercel 单独声明 Bun runtime

保留 `packageManager: "bun@1.4.4"` 和 CI 的 Bun 版本，删除 `engines.node` 及 `actions/setup-node`。在 `vercel.json` 设置 `bunVersion: "1.x"`，继续使用当前安装及构建命令。

### 保留 Node 兼容接口

保留 Next.js、AWS SDK、libSQL 和 Sharp 使用的 Node 兼容 API、`@types/node`、Next.js `nodejs` runtime 标识及 Vitest `node` 环境标签。相比逐个重写这些接口，使用 Bun 的兼容层修改面更小，也更能保持第三方依赖边界稳定。

### 替换直接启动 Node 的辅助入口

E2E preflight 通过 `process.execPath` 启动 Playwright，使其沿用当前 Bun 进程；CI fixture 计时通过 Bun 单行脚本读取时间。参数、环境和计时单位保持不变。

### 将 Playwright E2E spec 作为 TypeScript ESM 加载

Playwright 根据最近的 `package.json` 决定用 `require` 还是动态 `import` 加载测试文件。仓库根包未声明模块类型时，它会把 `.ts` 测试按 CommonJS 方式交给 Bun，导致类型语法解析失败。`tests/e2e/package.json` 声明 ESM 边界后，Playwright 使用动态导入，Bun 可直接加载现有 TypeScript spec，仍由 Bun 运行 Playwright CLI。

## Risks / Trade-offs

- **Vercel Bun runtime 与本地 Bun 存在差异** → 本地和 CI 固定 Bun 版本并构建验证；部署后仍需观察托管 runtime。
- **Sharp/libvips 等原生模块未必在托管环境正常加载** → 保留 Node runtime API 和现有构建策略，并在 Vercel 实际部署中验证。
- **本地沙箱限制 Turbopack 进程或端口绑定** → 在受限环境使用同一 Bun runtime 的 Webpack 构建验证应用；CI 和部署仍使用项目配置的默认构建命令。

## Migration Plan

1. 更新 package scripts、CI 工作流、Vercel runtime 与直接启动 Node 的辅助脚本。
2. 更新运行要求和已有工作流契约断言。
3. 执行类型检查、lint、静态配置扫描和生产构建；不迁移测试框架或运行测试集。
4. 部署后验证 Vercel Bun runtime、Sharp/libvips 与 AWS SDK Node stream 适配。

如需回滚，可还原本变更涉及的运行时配置、工作流和脚本；现有依赖锁文件、数据库 schema 与应用 API 不需迁移。

## Open Questions

- Vercel Bun runtime 的 Sharp/libvips 原生模块加载和 AWS SDK Node stream 适配，需要实际部署验证后关闭。
