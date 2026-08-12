# Package Boundaries Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修正 Domain、DB、Auth、tRPC、App 和 UI 的依赖方向，同时保持现有认证、API 与编辑器行为不变。

**Architecture:** 新增稳定的领域契约与无副作用 HTTP 元数据模块；将认证数据库与请求审计集中到 `packages/auth/server`；Route Handler 仅做 HTTP 适配；Tiptap 通过显式媒体选择器接口由后台 feature 注入实现。

**Tech Stack:** TypeScript 6、Next.js 16 App Router、Better Auth 1.6、Drizzle ORM、tRPC 11、React 19、Vitest。

## Global Constraints

- 不改变公开 URL、tRPC procedure、Better Auth 请求响应、数据库 schema 和页面文案。
- 不增加运行时依赖。
- 所有行为修改遵循测试先行，并在每个任务后运行针对性测试。
- 保留旧 tRPC 用户类型路径的兼容 re-export。

---

### Task 1: 建立领域契约和无副作用请求元数据

**Files:**

- Create: `src/packages/domain/user.ts`
- Create: `src/packages/http/client-ip.ts`
- Create: `src/packages/http/client-ip.test.ts`
- Modify: `src/packages/trpc/api/modules/user/types/user.level.ts`
- Modify: `src/packages/trpc/api/modules/user/types/user.status.ts`
- Modify: `src/packages/db/schema.ts`
- Modify: `src/packages/auth/policy.ts`
- Modify: `src/packages/auth/permissions.ts`
- Modify: `src/packages/auth/login-history.ts`
- Modify: `src/packages/trpc/api/utils/rate-limit.ts`
- Modify: `src/middleware.ts`

**Interfaces:**

- Produces: `UserLevel`, `UserStatus`, `userLevelOptions`, `userStatusOptions` from `@/packages/domain/user`.
- Produces: `getClientIp(request: Request): string` from `@/packages/http/client-ip`.

- [ ] **Step 1: Write failing client IP and compatibility tests**

Add tests that import the new stable paths and assert forwarded, real and anonymous IP behavior plus enum identity through old re-export paths.

- [ ] **Step 2: Run tests and verify missing-module failures**

Run: `bunx vitest run src/packages/http/client-ip.test.ts src/packages/domain/user.test.ts`

- [ ] **Step 3: Add the domain and HTTP modules and switch imports**

Move enum definitions to `domain/user.ts`, re-export them from old tRPC files, and move the existing pure `getClientIp` implementation out of `rate-limit.ts`.

- [ ] **Step 4: Run focused tests and type checking**

Run: `bunx vitest run src/packages/http/client-ip.test.ts src/packages/auth/policy.test.ts src/packages/auth/permissions.test.ts src/packages/db/schema.test.ts && bun run check-types`

### Task 2: Split Auth shared and server responsibilities

**Files:**

- Create: `src/packages/auth/providers.ts`
- Create: `src/packages/auth/providers.server.ts`
- Create: `src/packages/auth/server/login-history.repository.ts`
- Create: `src/packages/auth/server/auth-request-audit.ts`
- Create: `src/packages/auth/server/auth-hooks.ts`
- Modify: `src/packages/auth/social-providers.ts`
- Modify: `src/packages/auth/login-history.ts`
- Modify: `src/auth.ts`
- Modify: `src/app/api/auth/[...all]/route.ts`
- Modify: `src/app/api/account/security/login-history/route.ts`

**Interfaces:**

- Produces: `SOCIAL_PROVIDER_LABELS`, `SocialProviderId` from `providers.ts`.
- Produces: `getEnabledSocialProviders()` from `providers.server.ts`.
- Produces: `createAuditedAuthHandler(auth, handler)` and `listUserLoginHistory(db, userId)` from server-only modules.

- [ ] **Step 1: Write failing service and handler tests**

Cover current-user history isolation, failed username lookup redaction, successful session action recording, and audit failure preserving the original auth response.

- [ ] **Step 2: Run tests and verify missing exports**

Run: `bunx vitest run src/packages/auth/server`

- [ ] **Step 3: Implement server modules and reduce Route Handlers**

Move DB queries and audit orchestration into server modules; keep each Route Handler limited to dependency assembly, authentication and Response creation.

- [ ] **Step 4: Extract Better Auth hooks and provider server config**

Build database hooks through a typed factory used by `src/auth.ts`; keep provider labels in a client-safe module and environment access in a server-only module.

- [ ] **Step 5: Run Auth and account-security regression tests**

Run: `bunx vitest run src/auth-build.test.ts src/packages/auth 'src/app/api/account/security/login-history/route.test.ts' 'src/app/admin/(root)/(dashboard)/account/security'`

### Task 3: Invert the Tiptap media picker dependency

**Files:**

- Create: `src/packages/ui/extended/Tiptap/media-picker.tsx`
- Modify: `src/packages/ui/extended/Tiptap/index.tsx`
- Modify: `src/packages/ui/extended/Tiptap/components/ToolbarImageItem.tsx`
- Modify: `src/packages/ui/extended/Tiptap/components/ToolbarVideoItem.tsx`
- Modify: `src/packages/ui/extended/DynamicForm/DynamicField.tsx`
- Modify: `src/app/admin/(root)/(dashboard)/page/edit/PageEditorForm.tsx`
- Modify: `src/app/admin/(root)/(dashboard)/post/edit/components/PostTypeFields/index.tsx`

**Interfaces:**

- Produces: `MediaPickerRenderer` accepting `open`, `kind`, `onConfirm({ url })`, and `onCancel`.
- Consumes: App-level wrapper around existing `PhotoPickerModal`.

- [ ] **Step 1: Write failing toolbar dependency-injection tests**

Assert image/video buttons invoke an injected renderer and that source imports under `packages/ui` contain no `@/app` path.

- [ ] **Step 2: Run tests and verify the current hard dependency fails**

Run: `bunx vitest run src/packages/ui/extended/Tiptap`

- [ ] **Step 3: Add media picker context and pass it through DynamicField**

Define the minimal URL-only contract, provide it from Tiptap props, and consume it in both toolbar items without importing `MediaEntity` or `PhotoPickerModal`.

- [ ] **Step 4: Inject PhotoPicker from Page and Post features**

Wrap the existing modal in each rich-text feature and adapt `MediaEntity` to `{ url }` at the App boundary.

- [ ] **Step 5: Run editor tests and type checking**

Run: `bunx vitest run 'src/app/admin/(root)/(dashboard)/page/edit' 'src/app/admin/(root)/(dashboard)/post/edit' src/packages/ui/extended/Tiptap && bun run check-types`

### Task 4: Enforce and verify package boundaries

**Files:**

- Create: `src/packages/package-boundaries.test.ts`
- Modify: `openspec/changes/refactor-package-boundaries/tasks.md`

**Interfaces:**

- Produces: regression assertions over source import declarations.

- [ ] **Step 1: Write boundary tests**

Assert `packages/db` and `packages/auth` do not import `packages/trpc`, and `packages/ui` does not import `@/app`.

- [ ] **Step 2: Run boundary tests and remove remaining violations**

Run: `bunx vitest run src/packages/package-boundaries.test.ts`

- [ ] **Step 3: Run complete verification**

Run: `bun run check-types && bun run lint && bunx vitest run && bun run build`

- [ ] **Step 4: Validate OpenSpec and inspect the final diff**

Run: `openspec validate refactor-package-boundaries --type change --strict --no-interactive && git diff --check && git status --short`
