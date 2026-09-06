## Why

上一轮生产工程闭环完成后，复审仍发现公开内容输出、静态缓存写副作用、任意路径缓存刷新和 CI 分析退出行为存在可验证的风险。这些问题会分别造成存储型 XSS、浏览量失真与页面陈旧、缓存抖动以及 CI 超时，需要在不引入外部服务的前提下形成新的生产边界闭环。

## What Changes

- 对公开富文本和 JSON-LD 建立统一、可测试的输出安全边界，阻止存储内容突破脚本或 HTML 上下文。
- 将浏览量写入从可缓存 Server Component 渲染移到独立客户端上报路径，失败不得阻断内容读取。
- 将评论后的缓存失效输入收敛为经过运行时校验的内容标识，不再接受任意路径。
- 为文章、页面和评论写操作补充明确的公开内容缓存失效策略。
- 使 bundle 分析在 CI 中生成静态结果并正常退出，扩大无需外部服务即可执行的端到端门禁。
- 修正文档与 OpenSpec 严格校验问题，并清理确认未使用或版本未对齐的依赖。

## Capabilities

### New Capabilities

- `public-content-safety`: 约束富文本、JSON-LD 和公开内容缓存刷新边界的安全行为。
- `public-content-freshness`: 约束浏览量上报、写操作后的缓存失效和读取失败隔离。

### Modified Capabilities

- `application-use-case-boundary`: 明确可缓存 Server Component 不得执行持久化写入。
- `coverage-governance`: 增加无需外部服务即可持续执行的公开内容与关键 E2E 回归门禁。
- `dependency-supply-chain-hygiene`: 对齐框架工具版本并移除确认未使用的生产依赖。
- `documentation-workflow-cleanup`: 修正文档安全承诺并保持全量 OpenSpec 严格校验通过。

## Impact

- 影响公开文章、独立页面、评论提交、内容写入 Router、tRPC 客户端及 Next.js 缓存失效路径。
- 影响 Vitest、Playwright 和 GitHub Actions 质量门禁。
- 影响 `package.json`、锁文件、README、OpenSpec 主规格与变更记录。
- 不引入外部服务，不改变六位密码兼容策略，也不移除现有 CSP `unsafe-inline` 决策。
