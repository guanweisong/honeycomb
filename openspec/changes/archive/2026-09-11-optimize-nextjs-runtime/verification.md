# 验证记录

## 核心实现证据

- 所有影响公开内容的菜单、设置、分类、标签和用户写入口统一在持久化成功后调用公开缓存失效器，并由静态边界测试防止新增入口漏接。
- 文章、页面、菜单、设置和评论的服务端读取统一通过 `server-only` React `cache()` 查询入口；详情页 Metadata、正文与评论消费者共享同一请求级结果。
- Next Image 输出启用 AVIF/WebP，并收紧设备、小图尺寸目录和关键图片 `sizes`。
- `AdminProviders` 不再持有 Tiptap/媒体选择依赖；文章和页面编辑路由通过局部 Provider 与 `next/dynamic` 加载编辑能力。
- Serwist 排除 manifest screenshots、source map 和非必要后台路径；离线 URL 只有一处权威定义。
- 浏览量由已有 increment mutation 的返回值更新，失败保留服务端初始值，不发起第二次查询，也不失效静态详情页。
- 全局限流具备 750ms 默认超时、生产失败关闭、开发/测试显式降级和指标；评论创建使用独立的 5 次/分钟 procedure 限额。
- 公开布局和动态页面补齐 metadataBase、标题模板、canonical、hreflang、Open Graph/Twitter 默认值；后台允许缩放；根 not-found 复用 `PageState`。

## 命令执行记录

| 阶段 | 命令 | 结果 |
| --- | --- | --- |
| 最终源码门禁 | 最终源码提交钩子运行 `bun run check-types`、`bun run lint`、`bun run test:unit:run` | 通过；263 个测试文件、1175 项测试全部通过。 |
| 最终覆盖率 | `bun run test:unit:coverage` | 通过；263 个测试文件、1175 项测试全部通过。Statements 82.92%、Branches 75.14%、Functions 80.72%、Lines 84.11%。 |
| 迁移与差异检查 | `bun run db:migrations:check`、`git diff --check` | 通过；迁移治理检查 1 个迁移文件，无空白错误。 |
| 404 聚焦回归 | `bun run test:unit:run src/app/not-found.test.tsx src/packages/ui/extended/PageState/index.test.tsx src/app/app-structure.test.ts` | 3 个测试文件、9 项测试通过；随后类型检查通过。 |
| 生产构建 | 使用测试 URL/令牌运行 `bun next build --webpack` | 通过；26 个静态页面生成完成，`/_not-found` 为静态路由。仅保留 Serwist 依赖中的 browserslist 动态 require 警告。 |
| PWA 预算 | 生产构建的 Serwist 输出 | 114 个 precache 条目、4369.79 KiB；相较变更前记录的 114 个条目、7120.01 KiB，体积下降 2750.22 KiB（约 38.6%）。 |
| 后台分包 | 对比 dashboard、post/edit、page/edit 的 client reference manifests 与实际 chunks | dashboard 的加载 chunk 不包含 Tiptap/ProseMirror/PhotoPicker；post/edit 独有 Tiptap/ProseMirror 相关 chunk 约 755 KiB，媒体选择器入口只在编辑页 chunk 出现。 |
| 浏览器回归首轮 | 生产 `next start` 后运行完整 Chromium E2E | 24 项中 19 项通过；两个安全头断言使用了不一致的构建环境，三个后台契约缺少服务端会话夹具，均在后续诊断中修正。 |
| 安全头复跑 | 用与构建一致的环境运行 `security-headers.spec.ts --workers=1` | 2/2 通过；首轮失败确认由占位构建环境未包含真实 CSP 来源导致。 |
| 后台契约复跑 | 标准 Playwright 测试配置下串行运行 comment、media、page-edit | 3/3 通过；服务端使用 guest 测试会话，浏览器端权限与写请求使用内存 mock，页面 ID 使用符合 `IdSchema` 的 24 位值。 |
| 完整浏览器回归 | 开发服务器运行完整 Chromium E2E，并按运行环境复跑失败项 | 并行运行 22/24 通过；菜单串行复跑通过，Serwist 离线导航在生产服务器复跑 2/2 通过。全部 24 个场景均在对应运行环境通过。 |
| Bundle Analyzer | `bun run analyze`，沙箱内与授权环境各运行一次 | 两次均在 PostCSS 阶段因分析器内部子进程绑定端口被操作系统拒绝，未生成可用报告；Webpack manifest 级分析已完成。 |

## 补充诊断与环境说明

- `comment.spec.ts`、`media.spec.ts` 和 `page-edit.spec.ts` 原先只模拟客户端 `user.current`，无法越过 Server Component 布局鉴权。新共享夹具先用公开 guest 测试账号建立真实会话，再将过期客户端 Query 通过离线恢复事件刷新为 mock ADMIN；真实数据库只承担会话与用户读取，业务写请求全部由 Playwright 拦截。
- 页面编辑 E2E 的旧模拟 ID `page-created` 不符合 24 位 `IdSchema`，导致更新 mutation 在客户端校验阶段被拒绝；改用权威契约允许的固定测试 ID 后新增与更新完整通过。
- 生产模式建立测试会话时，当前 Upstash 超过 750ms 后返回 503，符合“生产失败关闭”设计；后台写入 UI 契约因此在开发模式的显式 fail-open 路径验证，生产分包和服务端路由由独立生产构建验证。
- Serwist 离线导航只在生产构建启用完整行为；开发模式的离线用例会得到 `net::ERR_FAILED`，生产服务器复跑 2/2 通过。
- Next 16 实验 Bundle Analyzer 的端口限制与工程既有验证记录一致。Webpack client reference manifest 和实际 chunk 对比已覆盖本次后台依赖下沉目标；后续仍可在允许分析器内部本地通信的 CI 中补生成可视化报告。

## 最终静态复扫

- 普通后台布局不再导入编辑器媒体 Provider；只有 post/edit 与 page/edit 路由引用 `EditorMediaProvider`。
- PWA 配置不预缓存 screenshots、source map 或后台路由匹配项，离线 fallback 仍保留。
- 公开读取没有回退到页面内重复 server caller；动态浏览量没有追加 query 或静态缓存失效。
- not-found 保持 Server Component，并通过共享 `PageState` 输出 `role="alert"` 和键盘可访问的返回链接。
