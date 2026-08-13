## 为什么

当前工程已具备较完整的类型、测试与安全基础，但覆盖率门禁无法通过、Next.js 存在已弃用约定、生产限流可静默失效，且仓库缺少不可绕过的 CI 验证。依赖审计还发现需升级和分级处置的公告，必须在下一次发布前形成闭环。

## 变更内容

- 修复关键环境模块的测试覆盖率，使既有覆盖率门禁恢复可用。
- 强化生产认证密钥校验，拒绝过短或低熵的 `AUTH_SECRET`。
- 将已弃用的 `middleware` 文件约定迁移为 Next.js `proxy` 约定。
- **BREAKING**：生产环境未配置 Upstash 限流服务时，API 请求不再默认放行，而是返回受控的服务不可用响应。
- 为公共站点与后台增加加载和错误恢复边界。
- 增加 GitHub Actions 质量门禁，覆盖类型、静态检查、覆盖率、构建、Cloudflare 产物与 E2E 验证。
- 升级直接及传递依赖并复核审计结果；将仅开发使用的工具保持在开发依赖中。

## 能力

### 新增能力

- `production-rate-limit-policy`：定义生产 API 限流依赖、故障行为及开发测试例外。
- `continuous-quality-gates`：定义受保护分支必须执行的自动化验证流程。
- `route-recovery-boundaries`：定义页面加载、异常隔离和安全恢复体验。

### 修改能力

- `coverage-governance`：要求已声明的关键覆盖率门禁在主分支保持可通过。
- `dependency-supply-chain-hygiene`：扩展到审计分级、锁文件复核和已知高危公告处置。
- `runtime-error-capture`：补充 App Router 客户端错误边界与安全恢复要求。
- `better-authentication`：补充生产认证密钥强度要求。

## 影响

涉及环境变量 schema、认证初始化、代理层、限流基础设施、App Router 路由文件、Vitest/Playwright 配置、依赖锁文件和 GitHub Actions。生产部署需要配置 Upstash，或在部署前显式完成对应的运行策略迁移。
