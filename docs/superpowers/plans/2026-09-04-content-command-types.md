# Content Command Types Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 Post/Page 从 Zod transport 到 Application 和 Drizzle mapper 的命令类型真实、无 `unknown` 缓冲和整体 ORM 断言。

**Architecture:** Application 拥有框架无关 DTO，Zod 输出通过编译期赋值证明兼容；Infrastructure 逐字段构造写入值并使用 `satisfies` 校验。运行时 JSON 协议和数据库值保持不变。

**Tech Stack:** TypeScript 6、Zod 4、Drizzle ORM、tRPC、Vitest

**Spec:** `openspec/changes/strengthen-content-command-types/design.md`

## Global Constraints

- Application Command DTO MUST 不导入 Zod 或 Drizzle。
- 外部 tRPC 输入输出和数据库 schema MUST 不变。
- mapper MUST 不使用整体 `as InferInsertModel`。
- 新增运行时窄化必须先有失败测试。

---

### Task 1: 扩展类型治理测试

**Files:**
- Modify: `tests/type-safety-governance.test.ts`
- Modify: `tests/migration-closeout.test.ts`

**Interfaces:**
- Produces: source checks scoped to Post/Page application repository and command mappers

- [ ] **Step 1: 添加命令契约红灯检查**

检查 `PostCommandInput`/`PageCommandInput` 所在文件不得出现命令字段 `unknown`、`[key:string]` 或 `Record<string`。

- [ ] **Step 2: 添加 mapper 红灯检查**

检查 Post/Page command mapper 不得包含 `as PostInsertValues`、`as typeof schema.*.$inferInsert` 或等价整体断言。

- [ ] **Step 3: 运行红灯**

Run: `bunx vitest run tests/type-safety-governance.test.ts tests/migration-closeout.test.ts`
Expected: FAIL on current Post and Page contracts/mappers.

### Task 2: 收紧 Post DTO 与 schema

**Files:**
- Modify: `src/features/post/application/repository.ts`
- Modify: `src/features/post/schemas/post.insert.schema.ts`
- Modify: `src/features/post/schemas/post.update.schema.ts`
- Modify: `src/features/post/application/post-commands.ts`
- Modify: `src/features/post/application/post-command-handlers.ts`
- Modify: `src/features/post/infrastructure/post-transforms.ts`
- Test: `src/features/post/tests/post.router.test.ts`
- Test: `src/features/post/tests/post-queries.test.ts`

**Interfaces:**
- Produces: `PostCreateCommand`
- Produces: `PostUpdateCommand = Partial<PostCreateCommand> & { id: string }`
- Uses: existing `I18n`, `PostStatus`, `PostType`, `EnableStatus`, `TagType`

- [ ] **Step 1: 定义框架无关命令 DTO**

字段准确表达 `I18n | null | undefined`、枚举、nullable media/time fields 和必填 `categoryId`；不导入 schema/ORM。

- [ ] **Step 2: 让 Zod 枚举输出匹配 DTO**

用 `z.enum`/既有 enum schema 替代 `z.string()`；增加类型级测试：`type _Check = z.output<typeof PostInsertSchema> extends PostCreateCommand ? true : never`。

- [ ] **Step 3: 运行类型检查确认调用方差异**

Run: `bun run check-types`
Expected: only real fixture/caller mismatches remain; no mapper-wide cast used to silence them.

- [ ] **Step 4: 显式实现 Post mapper**

逐字段返回对象并使用 `satisfies PostInsertValues`；创建与更新 mapper 分开，更新不得把未提供字段变成 `undefined` 写入。

- [ ] **Step 5: 修复 fixture 并运行聚焦测试**

Run: `bunx vitest run src/features/post/tests src/features/post/post-command-handlers.test.ts`
Expected: PASS with persisted values unchanged.

### Task 3: 收紧 Page DTO 与 mapper

**Files:**
- Modify: `src/features/page/application/repository.ts`
- Modify: `src/features/page/schemas/page.insert.schema.ts`
- Modify: `src/features/page/schemas/page.update.schema.ts`
- Modify: `src/features/page/application/page-use-cases.ts`
- Modify: `src/features/page/application/page-command-handlers.ts`
- Create: `src/features/page/infrastructure/page-transforms.ts`
- Create: `src/features/page/infrastructure/page-transforms.test.ts`
- Modify: `src/features/page/infrastructure/page-command-repository.ts`
- Test: `src/features/page/tests/page.router.test.ts`
- Test: `src/features/page/page-command-handlers.test.ts`

**Interfaces:**
- Produces: `PageCreateCommand { title: LocalizedText; content: LocalizedText; status?: PageStatus; template: PageTemplate }`
- Produces: `PageUpdateCommand = Partial<PageCreateCommand> & { id: string }`
- Produces: `toPageInsertValues`, `toPageUpdateValues`

- [ ] **Step 1: 定义 Page 命令并对齐 Zod**

用 `z.enum` 输出 `PageStatus`，保留 template enum；证明 schema output 可直接赋值给命令。

- [ ] **Step 2: 为 mapper 写失败测试**

断言内容双语清洗、title 原样保留、缺失 content 在 update 中不出现、空字符串 content 仍被清洗并写入。

- [ ] **Step 3: 抽取并实现显式 mapper**

`page-command-repository.ts` 只调用 mapper，不再读取 `unknown` 或断言整个 Drizzle model。

- [ ] **Step 4: 运行 Page 聚焦测试**

Run: `bunx vitest run src/features/page/tests src/features/page/infrastructure/page-transforms.test.ts`
Expected: PASS.

### Task 4: 验证协议等价与提交

**Files:**
- Modify: `openspec/changes/strengthen-content-command-types/tasks.md`

- [ ] **Step 1: 运行类型治理和架构测试**

Run: `bunx vitest run tests/type-safety-governance.test.ts tests/migration-closeout.test.ts tests/feature-boundaries.test.ts tests/architecture-complexity.test.ts`
Expected: PASS.

- [ ] **Step 2: 运行完整门禁**

Run: `bun run check-types && bun run lint && bun run test:unit:run && bun run test:unit:coverage && git diff --check`
Run build with documented build-only environment.
Expected: all PASS.

- [ ] **Step 3: 检查协议和 schema 未变化**

确认 tRPC procedure 名称、Zod 字段/可选性、Drizzle schema 和 `drizzle/` 均无非预期 diff。

- [ ] **Step 4: 更新 OpenSpec tasks 并提交**

Commit: `refactor(types): strengthen content commands`
