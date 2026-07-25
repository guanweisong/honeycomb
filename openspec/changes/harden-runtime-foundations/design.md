## Context

`src/app/sitemap.ts` 当前通过进程内 tRPC caller 在预渲染阶段访问 Turso，导致生产构建依赖外部数据库。环境变量散落在配置和服务模块中，仅在使用点报错；响应缺少统一安全策略；服务端模块也没有通过 `server-only` 建立编译期边界。应用同时部署到 Vercel 与 Cloudflare，因此方案必须兼容 Node 和 Worker 路径，并尽量保留静态渲染能力。

## Goals / Non-Goals

**Goals:**

- 构建在数据库不可访问时仍可完成。
- 生产实例接收请求前完成核心环境变量校验。
- 提供可验证且可按环境调整的 CSP 与安全响应头。
- 阻止 Client Component 导入数据库、认证和后端集成模块。
- 外部服务失败时采用明确、有界且可观测的降级。

**Non-Goals:**

- 不在本 change 引入第三方配置或密钥管理平台。
- 不使用 nonce CSP，避免把所有页面强制转换为动态渲染。
- 不重构业务查询或引入新的内容索引。
- 不实现结构化日志和指标；该能力由后续 change 提供。

## Decisions

### 1. Sitemap 运行时生成并有界降级

动态 sitemap 使用运行时请求触发的数据读取和明确的缓存周期，不参与构建期预渲染。查询成功时生成完整动态 URL；查询失败时返回首页及固定分类页，并通过统一错误入口报告。内容超过单个 sitemap 合理规模时使用 `generateSitemaps` 分片。

选择运行时生成而非构建快照，是因为内容发布频率高于部署频率，且现有 Turso 已是运行时数据源。降级仅保留静态 URL，避免用陈旧或部分数据假装完整成功。

### 2. 环境变量集中 Schema

使用 Zod 分别定义服务端核心配置、公开客户端配置和可选集成配置。核心配置在 `instrumentation.ts` 的 `register` 阶段校验；可选集成采用“全部未配置即禁用，部分配置即报错”的组合规则。校验异常只展示变量名和约束，不展示值。

客户端代码只从显式导出的 `clientEnv` 读取公开变量，防止动态访问 `process.env` 破坏 Next.js 的构建期内联语义。

### 3. 静态 CSP 与分阶段强制

CSP 由集中配置生成，根据站点、资源域、Analytics 和 Turnstile 的启用状态形成允许列表。开发环境增加热更新所需来源；生产环境默认严格。提供 report-only 开关用于上线观察，确认无误后切换强制策略。

选择静态 CSP 而不是 nonce，是为了继续支持静态页面、缓存和 CDN；若未来必须允许不可预测内联脚本，再单独设计 nonce 迁移。

### 4. `server-only` 放在服务端入口

数据库入口、认证、tRPC context/router/service、环境变量服务端入口及外部服务工具引入 `server-only`。纯类型、枚举、Zod 输入 Schema 和浏览器共享工具保持可共享。通过静态测试维护允许与禁止导入清单。

## Risks / Trade-offs

- [静态 CSP 与第三方脚本不兼容] → 先使用 report-only，E2E 覆盖 Analytics、Turnstile、图片和 PWA，再强制执行。
- [sitemap 降级导致短时缺少动态 URL] → 设置合理缓存并记录失败；下一次成功请求恢复完整结果。
- [Cloudflare 与 Node instrumentation 行为差异] → 仅在共同支持的启动路径执行纯配置校验，并分别运行 Next/OpenNext 构建。
- [`server-only` 暴露现有错误依赖] → 先添加静态测试，再按模块修正导入，不通过移除边界绕过。

## Migration Plan

1. 建立环境 Schema 和测试，迁移核心配置读取。
2. 增加服务端边界并修正导入。
3. 将 sitemap 改为运行时、缓存、降级和分片模型。
4. 以 report-only 部署 CSP 及其余强制安全头。
5. 验证 Vercel 与 Cloudflare 构建、E2E 和响应头后启用强制 CSP。

回滚时可关闭 CSP 强制模式并恢复 report-only；sitemap 可回退为仅静态 URL，但不得恢复构建期远程数据库查询。

## Open Questions

无。CSP 初始以 report-only 上线，强制切换由验证结果决定。
