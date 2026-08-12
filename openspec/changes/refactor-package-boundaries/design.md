## Context

项目采用 Next.js App Router、Better Auth、Drizzle 和 tRPC。当前物理目录已经分区，但 `packages/db`、`packages/auth` 仍从 `packages/trpc/api` 读取用户枚举和请求工具，`app/api` 直接承担认证审计数据库编排，`packages/ui` 的 Tiptap 工具栏直接导入后台页面的媒体选择器。这些反向依赖使底层模块无法独立加载和测试，并可能因单个工具导入触发无关的服务端初始化。

本次是保持行为不变的架构重构。现有账号安全 OpenSpec change 已完成但尚未提交，因此重构在当前工作区原位执行，不使用独立 worktree。

## Goals / Non-Goals

**Goals:**

- 建立 `domain → db/auth → trpc → app` 的稳定依赖方向。
- 保持 `app/api` 为薄 HTTP 适配层。
- 明确 Auth 共享纯函数与服务端数据库代码的边界。
- 让通用 UI 通过接口接收媒体选择能力，不直接导入具体 App feature。
- 使用自动化测试约束关键依赖边界。

**Non-Goals:**

- 不整体搬迁所有 `packages/trpc/api/modules`。
- 不改变 URL、tRPC procedure、Better Auth 配置、数据库 schema 或页面视觉行为。
- 不引入新的运行时依赖或 monorepo package。
- 不调整 `observability` 和 `security` 的公开 API；它们当前边界保持不变。

## Decisions

### 领域类型使用稳定入口并保留兼容导出

新增 `src/packages/domain/user.ts`，承载 `UserLevel`、`UserStatus` 及显示选项。DB、Auth 和权限模块改为直接依赖该入口；原 tRPC 用户类型文件改为 re-export，避免一次性修改全部调用方。

相比直接移动并全局改写所有导入，兼容导出可以在不改变现有 API 的情况下先纠正底层依赖方向，后续再按 feature 渐进迁移。

通用 I18n 值结构与基础 trim、非空校验同样下沉到 `src/packages/domain/i18n.ts`。DB 使用 Domain Schema 解析持久化值；tRPC 保留接口专用的中文错误消息和 Optional 输入 Schema，并从 Domain 导出稳定 `I18n` 类型。这样 DB 不再引用 tRPC，同时维持现有输入错误与数据库解析行为。

### 请求元数据独立于限流

新增 `src/packages/http/client-ip.ts`，只解析可信代理请求头，不读取环境变量、不初始化 Upstash。middleware、tRPC rate-limit 和 Auth 登录历史统一使用该模块。

### Auth 服务端实现集中到 server 子目录

保留 `src/auth.ts` 作为 Better Auth composition root，保留 `src/auth-client.ts` 作为浏览器客户端入口。新增服务端模块分别负责 Better Auth hook、认证 Route Handler 审计和登录历史 repository/query；`app/api` 只负责认证、调用服务和构造 Response。

共享 provider id、标签和事件分类保留为无 `server-only` 的纯模块；环境变量读取和数据库操作放入 `.server.ts` 或 `server/`。

### UI 使用媒体选择器接口

Tiptap 定义只包含 `url` 的媒体选择接口，通过 context 接收渲染器。后台 App layout 负责注入现有 `PhotoPickerModal`，同时覆盖 Page 与 Post 富文本入口。这样 UI 不知道 `app/admin` 或 tRPC 的 `MediaEntity`，同时保持现有图片和视频选择流程。

### 用边界测试防止回归

新增读取源码 import 声明的边界测试，至少断言：DB/Auth 不导入 tRPC，UI 不导入 App，HTTP 元数据模块不导入环境或限流依赖。使用 TypeScript AST 读取完整 import declaration，避免多行导入绕过约束；测试只约束已确认的稳定方向，不建立复杂自研 lint 框架。

## Risks / Trade-offs

- [兼容 re-export 暂时保留旧路径] → 底层依赖已经修正，调用侧路径可在后续 feature 修改时渐进迁移。
- [认证 Route Handler 重构影响审计事件] → 保留现有纯事件分类函数，并增加 handler 级测试覆盖成功、失败和降级行为。
- [媒体选择器注入遗漏] → Page 与 Post 富文本入口均增加组件测试，验证图片/视频按钮仍能打开选择器。
- [文件移动与当前未提交修改重叠] → 仅通过小步 `apply_patch` 修改，并在每一步运行针对性测试和 `git diff --check`。

## Migration Plan

1. 新增 domain 和 HTTP request metadata 稳定模块，通过兼容 re-export 切换底层依赖。
2. 抽取 Auth server 服务并让 Route Handler、Better Auth hooks 调用新接口。
3. 拆分 provider shared/server 定义。
4. 为 Tiptap 注入媒体选择器并删除 UI 到 App 的导入。
5. 运行边界测试、相关单元测试、类型检查、Lint 和构建。
6. 下沉 I18n 契约并强化边界测试的 import 解析后，再次执行完整验证。

回滚时可逐步恢复旧导入和 Route Handler 内联实现；本次不修改数据库结构，无数据回滚步骤。

## Open Questions

无。所有改动保持现有外部行为，领域模块后续是否继续扩展由新的 feature change 决定。
