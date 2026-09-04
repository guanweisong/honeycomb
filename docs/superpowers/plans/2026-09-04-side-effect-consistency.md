# Side Effect Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用最小同步编排修正评论通知和媒体删除的成功语义与可重试性。

**Architecture:** 评论数据库写入是唯一业务成功边界，通知整体 best-effort。媒体删除由 Application 先读取 keys、调用独立 storage port、最后删除 DB；Router 只装配依赖。

**Tech Stack:** TypeScript、tRPC、Drizzle、AWS S3 SDK、Vitest

**Spec:** `openspec/changes/simplify-side-effect-consistency/design.md`

## Global Constraints

- 不增加 Outbox、Cron、worker、新表或外部队列。
- 评论写入成功后通知失败 MUST 不改变 API 成功结果。
- 媒体对象删除失败 MUST 保留数据库记录。

---

### Task 1: 评论通知 best-effort

**Files:**
- Modify: `src/features/comment/application/comment-commands.ts`
- Modify: `src/features/comment/notifications/comment-delivery.ts`
- Modify: `src/features/comment/comment.router.ts`
- Test: `src/features/comment/tests/comment.router.test.ts`
- Test: `src/features/comment/comment-command-handlers.test.ts`

**Interfaces:**
- Produces: `createComment(..., notify): Promise<PublicComment>` where `notify` resolves `void` and cannot change success

- [ ] **Step 1: 添加通知查询失败测试**

Mock repository creation success and notification rejection; assert result is the sanitized created comment and logger receives a safe error.

- [ ] **Step 2: 添加数据库失败测试**

Mock `repository.create` rejection; assert notification is not called.

- [ ] **Step 3: 运行红灯测试**

Run: `bunx vitest run src/features/comment/tests/comment.router.test.ts src/features/comment/comment-command-handlers.test.ts`
Expected: notification rejection currently rejects the operation.

- [ ] **Step 4: 调整成功边界**

让 create repository 返回足够构造 `toPublicComment` 的记录；在创建后用完整 `try/catch` 调用通知，记录固定 event/operation，不记录邮箱、IP、UA 或内容。

- [ ] **Step 5: 运行绿灯和覆盖率检查**

Run focused tests; Expected: PASS.

### Task 2: 媒体存储优先删除

**Files:**
- Modify: `src/features/media/application/repository.ts`
- Modify: `src/features/media/application/media-use-cases.ts`
- Modify: `src/features/media/infrastructure/media-repository.ts`
- Modify: `src/features/media/media.router.ts`
- Test: `src/features/media/tests/media.router.test.ts`
- Test: `src/packages/infrastructure/storage/S3.test.ts`

**Interfaces:**
- Produces: `MediaRepository.findDeleteTargets(ids): Promise<Array<{id:string; key:string}>>`
- Produces: `MediaRepository.deleteRecords(ids): Promise<{success:true}>`
- Produces: `MediaStorage.deleteObjects(keys: readonly string[]): Promise<void>`
- Produces: `destroyMedia(repository, storage, ids)`

- [ ] **Step 1: 写 Use Case 顺序失败测试**

用 call-order 数组证明顺序为 `find → storage → database`；storage reject 时 database 未调用。

- [ ] **Step 2: 写幂等场景测试**

空目标直接返回成功；对象已不存在的 adapter 响应视为成功；DB reject 时第二次调用仍可重试。

- [ ] **Step 3: 运行红灯测试**

Run: `bunx vitest run src/features/media/tests/media.router.test.ts src/packages/infrastructure/storage/S3.test.ts`
Expected: new ports/functions absent or call order differs.

- [ ] **Step 4: 实现窄端口和 Use Case**

Repository 只执行 DB 查询/删除；S3 adapter 把 keys 转为 `DeleteObjectsCommand`；Router 注入两者。

- [ ] **Step 5: 删除 Repository 对 S3 的导入并运行边界测试**

Run: `bunx vitest run tests/feature-boundaries.test.ts tests/architecture-complexity.test.ts src/features/media/tests/media.router.test.ts`
Expected: PASS.

### Task 3: 全量验证与提交

**Files:**
- Modify: `openspec/changes/simplify-side-effect-consistency/tasks.md`

- [ ] **Step 1: 运行质量门禁**

Run: `bun run check-types && bun run lint && bun run test:unit:run && bun run test:unit:coverage && git diff --check`
Expected: PASS.

- [ ] **Step 2: 运行生产构建和相关 E2E**

运行 build；若现有本地服务阻止隔离 E2E，记录环境阻塞而不终止用户进程。

- [ ] **Step 3: 更新 OpenSpec tasks 并提交**

Commit: `fix(content): make side effects retryable`
