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
- 评论、推荐、友情链接等请求时数据 MUST 保持独立边界，不得阻塞文章或页面正文预取；后台私有数据 MUST NOT 进入公开预取结果。
- MUST NOT 为了引入请求时渲染、临时快照或请求标识而随意削弱 Blog 内容预取。确需调整时，MUST 同步更新行为规范及 `tests/e2e/blog/content-prefetch.spec.ts`，并用生产模式浏览器验证 RSC 预取响应包含正文或列表卡片且导航后内容正常显示。
- 缓存填充使用的 tRPC `requestId` 只允许作为服务端内部上下文，MUST NOT 进入 Blog 正文、查询参数或缓存键；不得把每请求 UUID 用作公开内容的缓存身份。

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
