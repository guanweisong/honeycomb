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
