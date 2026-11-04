## ADDED Requirements

### Requirement: 项目工具链由 Bun 执行

项目 MUST 将 Bun 1.4.4 固定为本地和 CI 的 JavaScript runtime 与包管理器。项目 CLI 和自动化工作流 MUST 通过 Bun 启动，并且项目 MUST NOT 要求安装 Node.js engine 或在 CI 安装 Node.js。

#### Scenario: 本地执行项目命令

- **WHEN** 开发者运行项目定义的开发、构建、检查或测试命令
- **THEN** 命令及其项目 CLI 由 Bun 执行

#### Scenario: CI 设置运行环境

- **WHEN** GitHub Actions 执行项目质量或构建工作流
- **THEN** 工作流安装锁定版本的 Bun，且不安装 Node.js

### Requirement: Vercel 使用 Bun runtime

Vercel 项目 MUST 通过 `bunVersion: "1.4.x"` 声明 Bun runtime，使 Functions 使用 Bun 1.4 次版本线；具体补丁版本由 Vercel 管理。项目 MUST 使用 Bun 执行既有依赖安装和构建命令。

#### Scenario: 构建 Vercel 部署

- **WHEN** Vercel 安装依赖并构建项目
- **THEN** 部署配置选择 Bun 1.4.x runtime，使用冻结锁文件安装依赖，并运行项目构建命令

### Requirement: Bun runtime 支持保留的 Node 兼容接口

项目 MUST 在 Bun runtime 下运行仍使用的 `node:*` 兼容接口和依赖；这些接口、`@types/node`、Next.js 的 `nodejs` runtime 标识及 Vitest 的 `node` 环境标签 MUST NOT 被当作启动 Node.js 进程的要求。项目脚本和 CI MUST NOT 直接调用 `node` 可执行程序。

#### Scenario: 运行依赖 Node 兼容接口的应用代码

- **WHEN** Bun 启动 Next.js 应用或项目脚本加载 `node:*` 兼容 API
- **THEN** 进程仍由 Bun 执行，并通过 Bun 的兼容层提供所需接口

#### Scenario: 运行 CI 辅助脚本

- **WHEN** CI 测量 fixture 生命周期或启动 Playwright
- **THEN** 辅助脚本通过 Bun 或当前 Bun 可执行程序运行，不查找 Node.js 可执行程序

#### Scenario: 在 Bun 下收集 Playwright 测试清单

- **WHEN** 开发者或 CI 使用 Playwright 的 `--list` 检查 E2E 测试
- **THEN** E2E TypeScript spec 按 ESM 加载，Playwright CLI 由 Bun 执行，并返回完整测试清单
