# 验证记录

日期：2026-09-11

## RED 证据

- Router 静态边界测试在迁移前对 Post、Page、Comment、Category、Tag、Menu、Setting、User 共 8 个入口全部失败，证明旧入口仍直接编排缓存。
- `PublicContentInvalidator` 契约测试最初因模块不存在而失败。
- Post/Page Application 测试最初 10 项中 8 项失败，Comment Application 测试最初 8 项中 5 项失败，其余目录 Feature 的代表性缓存测试最初 5 项失败，均证明副作用尚未进入 Use Case。

## 聚焦验证

- 缓存端口与 Next.js adapter：2 个测试文件、6 项通过。
- Post/Page Application：2 个测试文件、10 项通过。
- Comment Application 与 Router：2 个测试文件、14 项通过。
- 8 个公开内容 Router：8 个测试文件、64 项通过。
- Category、Tag、Menu、Setting、User Application 与静态缓存边界：6 个测试文件、27 项通过。
- 缓存、评论、媒体、Repository 契约与架构边界组合：9 个测试文件、53 项通过。

## 完整质量验证

- `bun run check-types`：通过。
- `bun run lint`：通过。
- `bun run db:migrations:check`：通过，1 个迁移文件。
- `bun run test:unit:run`：270 个测试文件、1209 项测试通过。
- `bun run test:unit:coverage`：270 个测试文件、1209 项测试通过；Statements 83.12%、Branches 75.24%、Functions 80.83%、Lines 84.35%。
- `bun run test:unit:process`：2 个测试文件、52 项测试通过。
- `bun run audit:production`：审批联网后通过，0 findings、0 exceptions。
- `bun next build --webpack`：通过，26 个静态页面完成生成。

## 环境限制

默认 `bun run build` 使用 Turbopack，在当前受限沙箱中因 PostCSS 子进程尝试绑定内部端口而失败（`Operation not permitted`）。这是既有环境限制；同一组隔离构建变量下的 Webpack 生产构建通过。Webpack 同时报告 Serwist 内部 Browserslist 动态 `require` 的既有非阻断警告。

## 结论

缓存失效、评论验证码与通知、媒体对象存储的执行顺序和失败语义均由 Application Use Case 持有。Router 只负责传输职责和 adapter 注入；Application 未直接依赖 Next.js、tRPC、Infrastructure、Resend 或 AWS SDK，旧缓存函数入口已移除。

## 友情链接补充验证

- 消费者复扫确认 `FRIENDLY_LINKS` 页面模板公开读取 Link 数据，而 Link 写入此前未接入缓存端口。
- RED：Link Application 缓存行为测试 3 项失败，Link Router 静态边界测试 1 项失败。
- GREEN：Link Application、Router、Repository 契约和静态缓存边界共 4 个测试文件、24 项测试通过。
- 完整回归：271 个测试文件、1214 项测试通过；类型检查与 Lint 通过。
- Webpack 生产构建通过，26 个静态页面完成生成；OpenSpec 严格校验通过。
- 类型检查曾与构建并行运行时因 `.next/types` 正在重建而报告生成文件缺失；构建结束后串行重跑通过，确认属于验证命令竞态而非源码错误。

## 多层缓存一致性补充验证

- RED：统一适配器 4 项测试因缺少 `invalidate(plan)` 全部失败；Post、Page、Media 14 项测试中 9 项因旧方法或缺少媒体失效失败；其余 7 个 Feature 的 31 项测试中 14 项因旧方法失败。
- RED：Post Repository 行为测试捕获到创建、更新、删除和标签更新共 4 次隐藏版本提升；Application 边界测试捕获到 User Application 对 tRPC `CleanZod` 的反向依赖。
- RED：sitemap 缓存配置测试确认 shard 与 shard-count 都没有共享 tag。
- GREEN：共享端口、Infrastructure adapter、Feature Use Case、Router、Repository 和架构聚焦验证均通过；详情引用会去重，批量文章/页面删除只提交一次失效计划。
- `bun run check-types`、`bun run lint` 和 `git diff --check`：通过。
- `bun run test:unit:run`：271 个测试文件、1217 项测试通过。
- `bun run test:unit:coverage`：271 个测试文件、1217 项测试通过；Statements 83.20%、Branches 75.36%、Functions 80.82%、Lines 84.43%。
- `bun run test:unit:process`：2 个测试文件、52 项测试通过。
- 隔离环境变量下 `bun next build --webpack`：通过，26 个静态页面完成生成；仅保留既有 Serwist/Browserslist 和测试密钥警告。
- OpenSpec 严格校验和最终依赖扫描：通过；Application 不再导入 tRPC/Infrastructure，Post Repository 不再执行缓存副作用，两个 sitemap 缓存共享主动失效 tag。

## 一致性窗口复审验证

- 消费者复扫确认 sitemap 从公开菜单派生分类 URL，因此 Category 创建、更新和删除均纳入 sitemap 失效范围。
- RED：6 个聚焦测试文件共 31 项中有 5 项按预期失败，分别捕获空计划被接受、路由先于内层缓存失效、Category 漏刷 sitemap，以及 Media 空目标重试无法修复缓存。
- GREEN：共享计划契约、统一适配器、Category、Media、Tag、User 和 Router 静态边界共 7 个测试文件、39 项测试通过。
- `bun run check-types`、`bun run lint` 和 `git diff --check`：通过。
- `bun run test:unit:run`：271 个测试文件、1222 项测试通过。
- `bun run test:unit:coverage`：271 个测试文件、1222 项测试通过；Statements 83.22%、Branches 75.37%、Functions 80.83%、Lines 84.45%。
- `bun run test:unit:process`：2 个测试文件、52 项测试通过。
- 隔离环境变量下 `bun next build --webpack`：通过，26 个静态页面完成生成；仅保留既有 Serwist/Browserslist 和测试密钥警告。
- `openspec validate move-side-effects-to-application --strict`：通过。

## 缓存初始化与公开身份边界验证

- RED：3 个聚焦回归测试分别失败，确认版本键缺失时首次 `INCR` 仍返回隐式默认版本 `1`、Better Auth 通用 `/update-user` 未禁用，以及旧文章缓存会原样返回作者账户内部字段。
- GREEN：首次版本提升越过隐式默认值，身份配置关闭通用资料写入口；文章作者 Schema、数据库列选择与映射均缩小为 `id/name`，旧缓存额外字段在解码时剥离。
- 聚焦回归：8 个测试文件、55 项测试通过；类型检查与 Lint 通过。
- `bun run test:unit:run`：271 个测试文件、1225 项测试通过。
- `bun run test:unit:coverage`：271 个测试文件、1225 项测试通过；Statements 83.23%、Branches 75.39%、Functions 80.83%、Lines 84.46%。
- `bun run test:unit:process`：2 个测试文件、52 项测试通过。
- `bun run db:migrations:check`：通过，1 个迁移文件；`bun run audit:production`：通过，0 findings、0 exceptions。
- 隔离环境变量下 `bun next build --webpack`：通过，26 个静态页面完成生成；仅保留既有 Serwist/Browserslist 和测试密钥警告。
- `openspec validate move-side-effects-to-application --strict` 与 `git diff --check`：通过。

## 评论边界与空操作补充验证

- RED：架构测试准确报告 Comment Application 经根 facade 间接到达 DTO、目标 Repository 和通知 adapter，并定位 `Headers` 在 Use Case 与 Repository 契约中的泄漏；评论行为测试确认目标/父评论规则未由 Application 执行；共享 Schema 测试确认空 ID 集合仍被接受。
- GREEN：Router 将请求头转换为纯 `CommentRequestMetadata`，Application 按 `captcha → target → parent → insert → notification → cache` 编排；目标 adapter 只返回类型化状态，持久化 adapter 不再隐藏业务校验。
- Comment 根目录 DTO/目标兼容出口已删除，公共 DTO 与树构建归 Application；孤儿回复仍保持不可见，查询只读取公共字段和头像散列所需邮箱。
- 真实 Better Auth handler 收到 `POST /api/auth/update-user` 返回 404，且测试不模拟 Better Auth。
- 聚焦回归：8 个测试文件、76 项测试通过；类型检查与 Lint 通过。
- `bun run test:unit:run`：273 个测试文件、1237 项测试通过。
- `bun run test:unit:coverage`：273 个测试文件、1237 项测试通过；Statements 83.33%、Branches 75.61%、Functions 81.02%、Lines 84.58%。
- `bun run test:unit:process`：2 个测试文件、52 项测试通过。
- `bun run db:migrations:check`：通过，1 个迁移文件；`bun run audit:production`：审批联网后通过，0 findings、0 exceptions。
- 隔离环境变量下 `bun next build --webpack`：通过，26 个静态页面完成生成；仅保留既有 Serwist/Browserslist 非阻断警告。
- Application 递归依赖图、HTTP 类型、旧 Comment facade、批量删除消费者复扫无遗留；`openspec validate move-side-effects-to-application --strict` 与 `git diff --check` 通过。
