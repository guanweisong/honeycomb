## 验证结果

- OpenSpec 严格校验：40 项通过。
- TypeScript、ESLint、差异空白检查均通过。
- 全量单测：307 个文件、1482 个测试通过。
- 覆盖率：语句 85.85%、分支 77.98%、函数 84.17%、行 87.08%。
- 生产依赖审计：0 个问题、0 个例外。
- Next.js 16 Webpack 生产构建通过。默认 Turbopack 构建在当前执行宿主上因禁止内部进程绑定端口而无法启动；Webpack 构建仅报告 Serwist 内部 `browserslist` 的既有静态分析警告。

## 静态复扫

Knip 复扫后不再存在未列出的源码直接依赖。以下结果经逐项核对后刻意保留：

- `src/app/(blog)/i18n/request.ts`、`src/app/sw.ts` 是 Next Intl 与 Serwist 的约定入口，分别由 `next.config.ts` 和 Serwist route 消费。
- `src/packages/ui/styles/globals.css` 由博客与后台样式入口导入；其中直接使用 `tw-animate-css`、`tailwindcss-animate`、`@tailwindcss/typography` 和 `shadcn/tailwind.css`，因此对应依赖不能删除。
- `tests/fixtures/**` 和 `tests/setup/server-only.ts` 由测试配置或动态路径测试消费。
- `scripts/backup-remote-database.ts` 与 `scripts/preflight-translation-migration.ts` 是生产迁移的人工运维工具，不属于应用导入图。
- `openspec` 是仓库级工作流命令，由宿主安装，不作为应用依赖打包。
- `scripts/check-migrations.ts` 可被 Bun 的无扩展名导入正常解析，相关测试通过；Knip 的 unresolved 结果是解析差异。
- shadcn 基础组件的备用导出、feature Repository/Port 契约类型、共享枚举与 `SettingPatchSchema` 是有意保留的稳定模块表面，不按当前仓库内调用次数裁剪。

jscpd 复扫剩余 4 组克隆、101 行，占源码 0.35%：

- Link/User 管理页壳的分页与空态渲染：业务状态和操作入口不同，继续抽象会增加跨 feature 耦合。
- Page/Post/Category 表格操作列：授权能力、路由和实体动作不同，仅保留视觉结构相似。
- Tiptap 图片/视频工具栏按钮：各自绑定不同命令与媒体语义，9 行薄适配不建立额外抽象。

本次已消除列表页上下文/标题解析和 Post/Page 浏览量跟踪两组实质性重复实现。
