## Context

只读 Feature 查询目前混有两种路径：有业务策略的 Application 查询，以及只转发给 Repository 的薄包装。Router 已负责组装 Repository，因此纯转发没有隔离额外职责。现有 Feature 边界测试能检查跨模块导入，但写入入口检查只覆盖少数固定 Feature。Drizzle 内容表集中在 `schema/content.ts`，已有 `schema/index.ts` 作为统一出口。

## Goals / Non-Goals

**Goals:**

- 让简单读取走 `Router/Server Query → Query/Repository` 的最短路径。
- 对所有当前及未来 Feature 的 tRPC mutation 验证 Application 用例边界。
- 拆分内容表定义，同时保持导出名、表名、列、约束、迁移和运行时行为不变。
- 更新过时说明与已验证覆盖率数据，消除测试配置的模块加载警告。

**Non-Goals:**

- 不改变公开 tRPC 契约、权限、缓存时效、SQL、数据库迁移或数据。
- 不删除带有策略、校验、映射、缓存或副作用的查询。
- 不调整 CSP、身份认证或其他与本次优化无关的运行时安全策略。

## Decisions

1. **只删除确认为纯转发的读取函数。** 先通过调用图检索列出消费者；Router 与 Server Query 直接使用现有 Query/Repository。保留公开目标检查、Application 错误转换、缓存和结果映射等真实职责。写入用例不因其实现简单而删除。
2. **用 TypeScript AST 做边界检查。** 测试从 `src/features` 目录发现 Feature，枚举 Router 内的 `.mutation()` 回调，并验证回调调用了本 Feature Application 模块导入的可执行函数。测试夹具覆盖违规处理器，使门禁针对行为而非旧文件名。
3. **按引用依赖拆分 Drizzle 表。** 将内容表移入同级 `content-*.ts` 文件，避免改变 Drizzle 配置的入口范围；`content.ts` 保留为原有符号的转出口。表定义依赖只沿现有方向传递，跨表关联集中留在对应关联表定义中。迁移门禁以迁移回放与当前 schema 的结构比对判断数据库变化，不以源文件路径变化替代结构判断。
4. **只修正证据明确的维护问题。** 更新 Admin redirect 注释和覆盖率基线。为消除 Vite native loader 警告，将测试配置改为显式 `.mts` ESM，并用 `import.meta.dirname` 解析本地路径；不改项目全局模块类型或依赖版本。

## Risks / Trade-offs

- [AST 检查可能误判未来的间接编排] → 当前约束限定 Router 只负责调用 Application；若出现本地 adapter 编排，需在测试中明确识别它，而不是放宽成文件级“导入过 Application 即通过”。
- [拆分表定义可能改变 Drizzle Kit 的发现或导出行为] → 保持原 schema 入口和 `content.ts` re-export，运行迁移回放/当前结构比对和类型检查。
- [查询调用路径变化可能遗漏消费者] → 先全量搜索被删除函数的调用点，再运行 Feature 路由和读取测试及完整单测。
- [工具加载方式存在版本差异] → 仅采用本仓库已安装 Vitest/Vite 版本支持且 CI 可复现的配置，不为消警告升级依赖。

## Migration Plan

1. 先增加读取层与 mutation 边界回归测试，确认测试能识别现有纯转发和违规处理器。
2. 收敛调用路径并拆分 schema，保留公开导出和数据库定义。
3. 更新文档与测试配置，运行类型、Lint、架构、数据库迁移结构、单元、覆盖率和进程测试。
4. 若 Schema diff 或 migration 输出变化，撤销拆分并重新按无行为变化方式拆组；不生成或提交数据库迁移。

## Open Questions

无。运行中发现不兼容的工具加载方式或非纯转发消费者时，优先保持其现有路径并记录到变更结果。
