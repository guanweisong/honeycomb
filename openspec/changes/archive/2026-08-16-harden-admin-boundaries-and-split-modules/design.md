## Context

当前 `src/app/admin/lib/admin-auth.ts` 同时负责会话读取、数据库查询和 Admin 用户投影。它位于 App Router，却直接导入 Infrastructure。权限矩阵文件同时包含静态数据和 AST 扫描逻辑，部分页面也将查询、转换和渲染集中在单文件中。

## Goals / Non-Goals

**Goals:**

- 让 Admin 当前用户查询通过 Identity/Application 层的窄接口完成。
- 保留现有导出路径、返回值、错误语义、权限结果和 UI 行为。
- 将静态授权数据与扫描/断言工具分离。
- 只按明确职责拆分大型业务模块，并为拆分后的入口保留稳定 API。
- 将行为保持不变原则固化到前端工程技能。

**Non-Goals:**

- 不修改数据库 schema、tRPC procedure、权限矩阵内容、路由 URL 或 UI 视觉。
- 不新增第三方依赖。
- 不进行与本次边界和拆分无关的性能重写。

## Decisions

1. **Admin 用户查询放在 Identity/Application，而不是继续留在 App Router。**
   新模块接收认证会话提供的用户 ID，并通过返回窄类型的查询用例获取启用用户。App Router 保留 `getAdminUser(headers)` 作为兼容适配器。相比直接把整个数据库 Repository 暴露给页面，这能隐藏 Drizzle 细节并保持调用点稳定。

2. **先用测试锁定行为，再迁移实现。**
   复用现有 `admin-auth.test.ts` 的行为断言，新增边界测试确保 App Router 模块不再直接导入数据库模块，Application/Identity 模块仍不依赖 App Router 或 tRPC。

3. **权限矩阵拆为“数据模块 + AST 规则模块”。**
   `capability-procedure-matrix-data.ts` 只保留测试矩阵数据；`capability-authorization-static.ts` 的扫描规则按规则职责下沉到同目录工具文件，原有测试入口和错误语义保持不变。相比把矩阵搬到 JSON，这样保留 TypeScript 类型和现有测试组合能力。

4. **页面拆分优先抽取纯函数和稳定 View Model。**
   对大型页面只移动查询参数、转换、列定义或局部渲染职责；不改变组件层级、Props 语义和客户端边界。每次拆分都保留原入口文件，避免大规模导入路径变更。

5. **技能规范明确重构护栏。**
   在 `frontend-structure` 的需求流程和大文件治理中增加：架构重构默认必须行为保持不变，除非用户明确批准行为变化；拆分应按职责进行，禁止借重构机会顺便改 API、UI、权限或数据模型。

## Risks / Trade-offs

- [风险] 新用例可能重复现有查询逻辑 → [缓解] 先建立单一窄返回类型，并让兼容适配器只负责 session-to-user-id 转换。
- [风险] 拆分 AST 工具改变扫描范围 → [缓解] 保留原有边界测试，并执行完整授权矩阵测试。
- [风险] 拆分造成循环依赖 → [缓解] 依赖方向固定为 App → Application/Identity → Infrastructure，拆分后运行包边界测试。
- [风险] 文件数量增加但职责没有真正变窄 → [缓解] 每个新文件只承载一种职责，并以相关测试作为验收标准。

## Migration Plan

1. 更新技能规范和 OpenSpec 任务。
2. 为 Admin 用户查询边界补测试并迁移实现。
3. 拆分授权矩阵与大型模块，逐组运行相关测试。
4. 执行类型检查、Lint、单元测试、覆盖率和构建。
5. 如发现行为差异，回滚对应拆分文件，不修改数据库或权限数据。
