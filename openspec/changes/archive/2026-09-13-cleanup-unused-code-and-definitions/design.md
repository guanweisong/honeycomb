## Context

审计覆盖全部已跟踪文件、生产 TypeScript 导入图、依赖清单和重复代码块。当前问题不是运行时缺陷，而是历史迁移留下的无消费者 barrel、重复依赖声明、过宽导出表面，以及两个已经出现同步风险的重复实现。工程必须继续满足 Next.js App Router、feature 公共边界、轻量 DDD 和唯一事实源约束。

## Goals / Non-Goals

**Goals:**

- 删除有静态证据证明无消费者且不属于框架约定的文件与依赖。
- 让 Comment/Post 公共 UI 通过单一、明确且不泄漏内部 hook 的 feature 出口使用。
- 将重复的浏览量跟踪和列表筛选标题规则收敛为各自唯一实现。
- 用架构测试固定本次复杂度下降，避免历史出口和依赖重新出现。

**Non-Goals:**

- 不修改路由、tRPC、数据库、缓存、鉴权和用户可见文案。
- 不删除 Next.js、next-intl、Serwist、CSS 和测试夹具的约定入口。
- 不为短小且语义不同的后台操作按钮、编辑器媒体按钮建立通用抽象。
- 不批量删除 shadcn 基础组件的完整导出面或测试中的第三方适配断言。

## Decisions

1. 保留 `comment/public` 与 `post/public`，但将其改成最小公共出口，并迁移博客页面及对应测试使用该出口。相比直接删除 public barrel，这能落实 feature 跨模块边界；相比继续 `export *`，最小具名导出不会把内部查询 hook 暴露到 Server Component 边界。
2. 删除四个无消费者的 Domain barrel 和数据库根 barrel。Domain 实现继续由本 feature 内部按具体文件导入，不保留只为目录完整性存在的 wrapper。
3. 依赖清理以真实源码/CSS/配置消费者为准。保留 CSS 中直接加载的 shadcn、Tailwind 插件；移除无消费者依赖和由 `radix-ui` 聚合包覆盖的直接 Radix 子包；将测试直接导入的传递包提升为显式开发依赖。
4. 浏览量逻辑收敛为一个内部 hook，Post/Page 组件仅负责取得各自 tRPC mutation。这样保持 hooks 调用规则和现有公开组件名，同时只维护一次去重、初始值复位和成功响应更新逻辑。
5. 列表页提取纯标题函数和单次筛选上下文解析函数。页面渲染与 metadata 共享解析结果，但各自仍独立创建请求级服务端客户端，不引入跨请求状态或缓存。
6. 只移除有明确内部消费者证据的 `export`；不把“当前无消费者”自动等同于删除 shadcn 组件或稳定跨 feature 类型契约。

## Risks / Trade-offs

- [移除 Radix 子包可能暴露隐式 peer 依赖] → 使用冻结后的 `bun.lock`、类型检查、完整单测和生产构建验证。
- [公共 barrel 可能意外跨越 Server/Client 边界] → 公共出口仅导出最终 Client Component，不再导出内部 hook，并运行 Next.js 构建。
- [列表解析提取可能改变缺失分类/作者时的回退] → 保留现有分支和字符串回退，并用已有页面及 metadata 测试验证。
- [静态未使用分析存在框架约定误报] → 仅删除经导入图与人工复核共同确认的候选，明确保留 i18n、Service Worker、CSS 和测试夹具入口。

## Migration Plan

1. 先增加/调整架构与行为测试，使公共入口、依赖清单和共享解析规则可验证。
2. 删除死出口并迁移 Comment/Post 公共导入。
3. 收敛重复实现和内部导出。
4. 更新依赖与锁文件，依次执行类型、Lint、专项测试、全量单测、覆盖率、构建和差异检查。
5. 若构建暴露依赖或边界问题，按 `bun.lock` 与本变更 diff 回滚对应最小批次。

## Open Questions

无。手工备份脚本、历史迁移审计脚本和双 favicon 本次明确保留。
