## Commit Workflow Convention

- Commit workflow is defined in `.codex/skills/english-commit/SKILL.md`.
- Agents MUST follow that skill definition when handling commit-related requests.

## AI Directory Convention

- Workflow root directory is `.codex`.
- Skill root directory is `.codex/skills`.
- Each skill directory MUST contain a `SKILL.md`.
- Commit skill path is `.codex/skills/english-commit/SKILL.md`.

## 全仓审视与复审

- 全仓审视（包括架构与过度设计复审）MUST 执行[全仓复审流程](docs/architecture-dependency-report.md#全仓复审)。同时覆盖目录与文件清单，以及从真实入口到持久化、外部副作用和界面反馈的调用链。
- 发现一种重复职责或缺陷后，MUST 在同类业务、其他入口和测试流程中追查同一模式。逐项给出证据和验证范围，并注明必须保留的契约与待验证项。

## Blog 内容预取保护

- Blog 公开内容预取是核心体验契约。改动博客路由、站内链接、数据读取、缓存、Query hydration 或 Suspense 边界时，MUST 保留文章与独立页面正文、菜单分类列表首屏卡片随目标 URL 预取，并确保导航能复用预取结果。权威行为规范见 [即时导航](openspec/specs/instant-navigation/spec.md)。
- 评论、友情链接等请求时数据 MUST 保持独立边界，不得阻塞文章或页面正文预取；文章详情的猜你喜欢查询按已确认的页面行为在完整 URL 预取阶段等待，允许延迟完整文章 RSC 预取，但最终响应必须包含正文，推荐失败只省略推荐模块。后台私有数据 MUST NOT 进入公开预取结果。
- MUST NOT 为了引入请求时渲染、临时快照或请求标识而随意削弱 Blog 内容预取。确需调整时，MUST 同步更新行为规范及 `tests/e2e/blog/content-prefetch.spec.ts`，并用生产模式浏览器验证 RSC 预取响应包含正文或列表卡片且导航后内容正常显示。
- 缓存填充使用的 tRPC `requestId` 只允许作为服务端内部上下文，MUST NOT 进入 Blog 正文、查询参数或缓存键；不得把每请求 UUID 用作公开内容的缓存身份。

## Next.js 预渲染保护

- 路由和 Server Component 默认 MUST 保留预渲染及既有 URL 预取。引入 `connection()`、`io()`、请求时 API、动态渲染配置、缓存退出机制或类似实现前，MUST 确认语义必要性和目标阶段；MUST NOT 只为消除预渲染诊断、读取无语义要求的当前时间或生成随机值而使用。`connection()` 只用于确实需要等待真实请求的代码；`io()` 只用于有意将同步读取排除在静态壳之外。
- 内容应在按 URL 预取阶段生成时，MUST 使用符合当前 Next.js 配置和版本语义的 `prefetch()`；缓存范围外的 `connection()` / `io()` 会排除后续内容的链接预取。确需动态渲染时，MUST 将边界限制在必要代码，并保留不依赖请求值的可预渲染内容。
- 耗时观测 MUST 使用 `performance.now()` 等单调时钟。无参数 `new Date()`、`Date.now()`、`Math.random()`、`crypto.randomUUID()` 等非确定性读取 MUST NOT 仅为日志、指标或内部请求关联进入预渲染输出；内部标识 MUST NOT 进入公开内容、URL 参数或公开内容缓存身份。权威要求见 [Next.js 运行时性能规范](openspec/specs/nextjs-runtime-performance/spec.md)。

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
