# 验证记录

## User Application 契约迁移

- 权威定义：`src/features/user/application/ports.ts`、`credential-port.ts`、`login-history-port.ts`。
- 对外导出：`src/features/user/application/repository.ts`。
- Application 消费者：用户 commands、queries、use cases 与状态变更 handler。
- Infrastructure 消费者：用户 repository 实现及窄端口 adapter。
- Presentation/Transport 消费者：用户 ViewModel、User Router、Account Security Router、认证与登录历史用例。
- 测试消费者：User 用例、Repository adapter、Router、认证与架构边界测试。

## 命令执行记录

| 阶段 | 命令 | 结果 |
| --- | --- | --- |
| RED 基线 | `bunx vitest run tests/manifest.test.ts tests/architecture-complexity.test.ts` | 按预期失败：缺少离线 precache、存在 4 个遗留 PWA 资产、3 个 User 根级端口和 2 个事件基础设施文件。 |
| RED 基线 | `bunx vitest run src/packages/infrastructure/observability/server/registry.test.ts` | 按预期失败：默认 noop Metrics 没有结构化输出。writer fail-open 断言通过。 |
| PWA 聚焦单测 | `bunx vitest run tests/manifest.test.ts` | 3 项通过。 |
| 事件聚焦测试 | `bunx vitest run tests/domain-aggregate-contracts.test.ts tests/architecture-complexity.test.ts src/features/post/domain/post.test.ts src/features/comment/domain/comment.test.ts src/features/user/domain/user.test.ts src/features/post/post-command-handlers.test.ts src/features/page/page-command-handlers.test.ts src/features/comment/comment-command-handlers.test.ts src/features/user/user-command-handlers.test.ts` | 41 项通过；仅下一阶段预期保留的 User 根级端口门禁失败。事件符号复扫无结果。 |
| 核心 Feature 回归 | Post、Page、Comment、User 的 Domain、Use Case、Router 与副作用相关测试 | 68 个测试文件、300 项测试通过。 |
| PWA 静态文档 | `bunx vitest run src/packages/infrastructure/pwa/offline-document.test.ts src/app/(blog)/error.test.tsx tests/manifest.test.ts` | 3 个测试文件、5 项测试通过；离线文档移除水合脚本并保留原生重试。 |
| PWA 生产构建 | 隔离假配置下 `bun next build --webpack` | 通过；Serwist 生成 114 个 precache 条目，包含带 revision 的 `/en/offline`。仅保留 Serwist 内部 browserslist 动态 require 警告。 |
| PWA 生产 E2E | 生产 `next start` 后两次运行 `pwa-offline.spec.ts --grep 'service worker serves'` | 两轮均通过，分别耗时 4.9 秒和 1.9 秒。 |
| 类型与静态质量 | `bun run check-types`、`bun run lint`、`git diff --check` | 全部通过。 |
| 迁移治理 | `bun run db:migrations:check` | 通过；检查 1 个迁移文件。 |
| 全量单测 | `bun run test:unit:run` | 252 个测试文件、1140 项测试全部通过。 |
| 全量覆盖率 | `bun run test:unit:coverage` | 252 个测试文件、1140 项测试通过；Statements 82.03%、Branches 74.66%、Functions 80.25%、Lines 83.09%。 |
| 进程级门禁 | `bun run test:unit:process` | 首轮发现 Console Metrics 缺少逐文件阈值，补齐 90/80 配置后 2 个测试文件、52 项测试通过。 |
| 关键浏览器回归 | 服务器与 Playwright 使用同一现有环境配置，运行安全响应头、RBAC、PWA 三组 Chromium E2E | 6/6 通过；未调用真实第三方服务。首次未同步环境变量的运行因 CSP 预期来源与服务器实际来源不同而失败，统一同一配置后通过。 |
| 依赖审计 | `bun audit --production`、`bun outdated`、限定 `bun update next-intl` 与 lockfile 路径检查 | 实时审计返回 17 项原始告警；唯一生产例外仍为 `next-intl@4.14.2>@parcel/watcher@2.5.6>picomatch@4.0.3`，当前无兼容升级，例外已更新到 2026-12-01。 |
| OpenSpec 校验 | `openspec validate close-engineering-production-loops --strict` | 通过。 |
| 旧变更收尾 | 同步并归档 `harden-end-to-end-type-safety` | 4 条新增要求和 1 条修改要求已合并至主规格；旧变更 18/18 任务完成，已归档至 `openspec/changes/archive/2026-09-06-harden-end-to-end-type-safety`。 |

## 生产与分析环境限制

- `bun run build` 使用 Next.js 默认 Turbopack；在沙箱内和获准的外层执行中均因 PostCSS 子进程绑定内部端口被操作系统拒绝，错误为 `Operation not permitted`。
- `bun run analyze` 和官方无服务器输出模式 `next experimental-analyze --output` 触发相同限制，分析器未生成可用报告，未记录为通过。
- 相同的隔离假 URL、令牌和密钥配置下，`bun next build --webpack` 成功；上述失败发生在编译 PostCSS 阶段、任何数据库请求之前，没有连接真实数据库。
- 生产 PWA 与关键 E2E 为读取现有 `.env` 的本地服务器验证；测试拦截外部浏览器请求，不写生产数据。后续应在允许 Turbopack 子进程本地通信的 CI 或开发环境复跑默认构建和分析器。

## 最终静态复扫

- 生产源码中没有 `DomainEvent`、`InProcessEventBus`、`pullEvents`、pending events 或已删除事件 handler 的消费者。
- 所有 feature 根目录均没有 `ports.ts` 或 `*-port.ts`；User 契约只由 `application` 拥有。
- `public` 中没有 `sw.js`、source map 或 `workbox-*`；唯一 Service Worker 路径为 `/serwist/sw.js`。
- 四份被当前 OpenSpec 完整覆盖且无引用的临时计划已删除；长期 README、架构、复杂度、测试与依赖审计文档已同步。

## 未验证边界

- `bun run audit:production` 的再次联网执行受当前策略限制，不能将离线 lockfile 分析替代为脚本成功结果。
