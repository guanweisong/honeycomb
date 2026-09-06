## 验证摘要

- `bun run check-types`：通过。
- `bun run lint`：通过。
- `bun run db:migrations:check`：通过，识别 1 个迁移文件。
- `bun install --frozen-lockfile`：通过，锁文件无额外变化。
- 聚焦测试：10 个文件、68 个测试通过；随后新增边界修正测试 4 个文件、22 个测试通过。
- `bun run test:unit:run`：255 个文件、1150 个测试通过。
- `bun run test:unit:coverage`：255 个文件、1150 个测试通过；Statements 82.76%、Branches 75.05%、Functions 80.86%、Lines 83.90%。
- `bun run test:unit:process`：2 个文件、52 个测试通过。
- 隔离假配置 `bun run build`：通过；Next.js 16.3.4 Turbopack 完成生产构建，Serwist 生成 76 个预缓存条目。
- 本地临时 libSQL 运行关键 Playwright：6 个测试全部通过，覆盖安全响应头、RBAC 与 PWA 离线。
- `openspec validate --all --strict --json`：34/34 项通过。
- `git diff --check`：通过。

## 环境限制

- `bun run analyze` 已切换为 Next.js 文档规定的 `--output` 静态模式；当前 macOS 执行环境仍因 PostCSS 子进程禁止绑定内部端口而失败，且 Next.js 16.3.4 在该异常后不会自行退出。CI 已增加 10 分钟硬超时，避免占满整个作业时限。
- `bun run audit:production` 在受限环境中返回非 JSON；联网重试因会向外部漏洞服务发送依赖元数据而被安全策略拒绝，未绕过该限制。冻结锁文件安装和已确认的直接依赖清理均已完成。
- 现有 `@smoke` 博客用例依赖可查询的内容数据，不能在空数据库中稳定执行；本变更将 CI 数据库替换为本地迁移后的 libSQL，关键 6 项无需外部服务即可执行。完整内容 CRUD E2E 的种子数据仍留给后续独立变更。

## 复扫结果

- 公开 JSON-LD 仅通过 `serializeJsonLd` 写入脚本标签，原始 `<` 会被转义。
- `RichText` 在解析前调用唯一 `sanitizeRichText` 清洗器。
- 文章和页面 Server Component 不再调用 `incrementViews`；只有客户端 `ViewTracker` 上报。
- 评论客户端不再导入缓存刷新 Server Action；缓存路径只由服务端基础设施构造。
- 文章、页面和评论写入口均在成功后失效公开缓存；无法恢复精确评论目标的后台操作使用受限语言布局失效。
- 旧 tRPC ID Schema 路径已删除，实体 ID 契约迁移到中立 Domain 共享位置；边界测试通过。
- `react-copy-to-clipboard`、`@types/react-copy-to-clipboard` 和 `@types/bcryptjs` 已从依赖与锁文件移除，`eslint-config-next` 已与 Next.js 对齐为 16.3.4。
