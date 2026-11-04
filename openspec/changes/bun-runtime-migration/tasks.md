## 1. 统一项目命令与平台运行时

- [x] 1.1 为 Next.js、Vitest、ESLint、Prettier、Drizzle Kit、Husky 和 OpenSpec CLI 显式选择 Bun runtime。
- [x] 1.2 固定本地和 CI 的 Bun 版本，移除 Node.js engine 与 CI Node 安装，并为 Vercel 配置 Bun runtime。

## 2. 移除直接启动 Node 的项目入口

- [x] 2.1 让 E2E preflight 使用当前 Bun 可执行程序启动 Playwright，并将 CI fixture 计时改为 Bun。
- [x] 2.2 更新既有质量工作流和子进程契约断言，保留 Node 兼容 API 与框架环境标签。
- [x] 2.3 为 Playwright E2E TypeScript spec 添加 ESM package 边界，确保 Bun 运行时可收集测试。

## 3. 同步环境文档

- [x] 3.1 将 README 的环境要求改为 Bun，并更新 Sharp/libvips 在托管环境的运行说明。
- [x] 3.2 明确 Vercel Bun runtime 及原生模块加载仍需真实部署验证。

## 4. 验证迁移结果

- [x] 4.1 完成类型检查、lint、工作流 YAML 解析、Node 可执行调用扫描及差异格式检查；未运行测试集。
- [x] 4.2 使用隔离临时数据库完成 Bun + Webpack 生产构建和 Serwist 产物生成；记录沙箱中默认 Turbopack 的端口绑定限制。
- [x] 4.3 运行 OpenSpec 严格校验，确认变更工件结构和规格有效。

## 5. 收窄 Vercel Bun runtime 次版本

- [x] 5.1 将 Vercel Bun runtime 配置为 1.4.x，并同步设计与规格说明。
