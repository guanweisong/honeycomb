# Comment Application Boundary Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Comment Application own request-independent business rules and outputs, reject empty batch mutations, and prove the disabled Better Auth write route at the real handler boundary.

**Architecture:** Transport converts HTTP headers into a small request-metadata value and injects persistence, target-query, notification, captcha, and cache ports. Comment Application reads raw target state and enforces visibility/commentability/parent rules before persistence; Infrastructure performs only database mapping and I/O. A recursive architecture test follows local re-exports so root facades cannot hide reverse dependencies.

**Tech Stack:** TypeScript, Zod, Better Auth 1.7.4, Drizzle ORM, Vitest, OpenSpec

**Spec:** `openspec/changes/move-side-effects-to-application/design.md`

## Global Constraints

- Preserve public comment response fields, notification best-effort behavior, cache failure propagation, status codes, and database schema.
- Application and its Repository contracts must not accept HTTP types or import Infrastructure, notification adapters, database types, or tRPC.
- Target visibility and parent-source checks happen after captcha validation and before comment insertion.
- Work directly on the current branch; do not create a worktree or commit until explicitly requested.

---

### Task 1: Establish failing architecture and behavior evidence

**Files:**
- Modify: `tests/architecture-complexity.test.ts`
- Modify: `src/features/comment/comment-command-handlers.test.ts`
- Create or modify: shared batch-schema and authentication tests

**Interfaces:**
- Produces: wished-for `CommentRequestMetadata`, target state query methods, and handler-level 404 behavior.

- [x] Add an architecture test that follows local imports/re-exports from Application and reports any path reaching `infrastructure` or `notifications`; separately reject `Headers`, `Request`, `Response`, and tRPC types in Application contracts.
- [x] Change Comment command tests to pass literal `{ ip, userAgent }`, inject target-state reads, and assert `captcha → target → parent → insert → notification → cache`.
- [x] Add tests proving unpublished, disabled-comment, mismatched-parent, and missing-target states reject before insertion.
- [x] Add a shared schema test expecting `{ ids: [] }` to fail and a real Better Auth handler test expecting POST `/api/auth/update-user` to return 404.
- [x] Run only these tests and confirm failures identify the current HTTP contract, hidden re-exports, repository-owned rules, empty-array acceptance, and missing handler test support.

### Task 2: Move Comment policy and DTO ownership into Application

**Files:**
- Modify: `src/features/comment/application/repository.ts`
- Modify: `src/features/comment/application/comment-commands.ts`
- Modify: `src/features/comment/application/comment-public-queries.ts`
- Create: `src/features/comment/application/comment-target-policy.ts`
- Create: `src/features/comment/application/comment-public-dto.ts`
- Modify: `src/features/comment/infrastructure/comment-target-repository.ts`
- Modify: `src/features/comment/infrastructure/comment-command-repository.ts`
- Modify: `src/features/comment/infrastructure/comment-query-repository.ts`

**Interfaces:**
- Produces: `CommentRequestMetadata = { ip: string | null; userAgent: string | null }`.
- Produces: target repository methods that return typed target state and parent target data without throwing business errors.
- Produces: `toPublicComment(comment: PublicCommentSource): PublicCommentNode` owned by Application.

- [x] Define the request metadata, discriminated target-state, parent-target, command, and query contracts once in Application.
- [x] Implement pure Application assertions for target existence, published status, comment enablement, and parent-target equality.
- [x] Make create/list Use Cases call those assertions before persistence/query, retaining existing errors and operation order.
- [x] Make Infrastructure adapters return raw typed state and accept pure request metadata; remove validation orchestration from persistence methods.
- [x] Move the public DTO mapper to Application, make database adapters map rows to a pure Application source type, and delete the old root DTO exports.
- [x] Run Comment Application, repository, Router, security-response, and type tests until green.

### Task 3: Remove hidden adapters and harden shared entry validation

**Files:**
- Modify: `src/features/comment/application/comment-use-cases.ts`
- Modify: `src/features/comment/comment.router.ts`
- Delete: `src/features/comment/comment-target.ts`
- Delete: `src/features/comment/comment-dto.ts`
- Modify: `src/packages/trpc/api/schemas/delete.batch.schema.ts`
- Modify: `tests/architecture-complexity.test.ts`

**Interfaces:**
- Consumes: pure Comment Application contracts from Task 2.
- Produces: Application-only barrel and non-empty batch input.

- [x] Remove root compatibility exports and notification-adapter exports from the Application barrel.
- [x] Make Router import notification functions from their adapter location, extract request metadata, and inject the target repository separately.
- [x] Change `DeleteBatchSchema.ids` to `IdSchema.array().min(1)` and verify all batch Router tests retain valid non-empty fixtures.
- [x] Run architecture, Comment Router, all affected delete Router, and shared schema tests until green.

### Task 4: Prove authentication behavior and complete verification

**Files:**
- Modify/Create: `src/auth*.test.ts`
- Modify: `docs/architecture-dependency-report.md`
- Modify: `openspec/changes/move-side-effects-to-application/{tasks.md,verification.md}`

**Interfaces:**
- Consumes: production `auth` configuration.
- Produces: request-level evidence that `/update-user` is not registered.

- [x] Import the real Better Auth implementation with database configuration absent and call `auth.handler` using a literal POST request to `/api/auth/update-user`; assert status 404 without mocking Better Auth.
- [x] Run focused tests, type checking, Lint, complete unit/coverage/process suites, migration governance, production dependency audit, Webpack production build, OpenSpec strict validation, and `git diff --check`.
- [x] Rescan Application import/re-export graphs, HTTP types, side-effect calls, old Comment facades, and empty batch consumers; update architecture and verification records with exact results.
