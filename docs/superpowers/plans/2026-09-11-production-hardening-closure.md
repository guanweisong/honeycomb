# Production Hardening Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the confirmed authentication, browser-cache, comment privacy, data-integrity, resource-bound, media, accessibility, and governance findings from the repository-wide audit.

**Architecture:** Keep tRPC as transport, Application use cases as orchestration owners, repositories as atomic persistence owners, and infrastructure as framework/external adapters. Harden boundaries with shared runtime schemas, explicit public-only Service Worker routes, database constraints, and regression tests that exercise externally observable behavior.

**Tech Stack:** Next.js 16.3.4, React 19.3, TypeScript 6, tRPC 11, Zod 4, Drizzle/libSQL, Serwist 9, Vitest 4, Playwright 1.63.

**Spec:** `docs/superpowers/specs/2026-09-11-production-hardening-closure-design.md`

## Global Constraints

- Work on the current `master` checkout because the user explicitly requested the current branch.
- Preserve all pre-existing unstaged and untracked work; stage only files owned by the current task.
- Every production behavior change requires a failing regression test before implementation.
- Client Components must not import server-only modules; Application modules must not import infrastructure implementations.
- Only absolute paths under `/admin` are valid post-login callback destinations.
- `/api/**` and `/admin/**` must never enter Service Worker runtime caches.
- Public `BAN` comments must keep their tree position but must not expose original content.
- Pagination maximum is 100; query-string maximum is 200 characters; destructive/tag batches maximum is 100 IDs.
- Media uploads accept JPEG, PNG, GIF, WebP, and AVIF only; maximum file size is 20 MiB; maximum batch size is 20.
- Preserve database-first public-cache invalidation and object-first idempotent media deletion semantics.
- Final verification must include types, lint, full unit tests, process tests, migrations, production dependency audit, build, OpenSpec validation, and `git diff --check`.

---

### Task 1: Authentication and browser-cache isolation

**Files:**
- Create: `src/app/admin/(root)/login/safe-admin-callback.ts`
- Modify: `src/app/admin/(root)/login/page.tsx`
- Modify: `src/app/admin/(root)/login/components/LoginClient/index.tsx`
- Modify: `src/app/admin/(root)/(dashboard)/components/DashboardClientShell/index.tsx`
- Modify: `src/app/sw.ts`
- Modify: `next.config.ts`
- Test: adjacent login, dashboard shell, PWA, and boundary tests

**Interfaces:**
- Produces: `normalizeAdminCallback(value: unknown): string`
- Produces: public-only Serwist runtime caching entries with network-only private routes

- [ ] **Step 1: Write failing callback and logout tests**

```ts
expect(normalizeAdminCallback("/admin/post?x=1")).toBe("/admin/post?x=1");
for (const value of ["javascript:alert(1)", "//evil.test", "https://evil.test", "/blog"]) {
  expect(normalizeAdminCallback(value)).toBe("/admin/dashboard");
}
expect(hardNavigate).toHaveBeenCalledWith("/admin/login");
```

- [ ] **Step 2: Run focused tests and confirm failures come from missing normalization/cache clearing**

Run: `bunx vitest run 'src/app/admin/(root)/login' 'src/app/admin/(root)/(dashboard)/components/DashboardClientShell' tests/pwa-precache-config.test.ts`

- [ ] **Step 3: Implement normalization, hard logout navigation, and remove the global dynamic stale-time override**

```ts
export function normalizeAdminCallback(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/admin") || value.startsWith("//")) return "/admin/dashboard";
  const parsed = new URL(value, "https://honeycomb.invalid");
  return parsed.origin === "https://honeycomb.invalid" && parsed.pathname.startsWith("/admin") ? `${parsed.pathname}${parsed.search}${parsed.hash}` : "/admin/dashboard";
}
```

- [ ] **Step 4: Write a failing Service Worker source-boundary test proving private routes cannot match a cache strategy**

```ts
expect(workerSource).toContain('pathname.startsWith("/api/")');
expect(workerSource).toContain('pathname.startsWith("/admin")');
expect(workerSource).not.toContain("for (const entry of defaultCache)");
```

- [ ] **Step 5: Replace broad defaults with explicit static/public captures and run focused tests**

Run: `bunx vitest run tests/pwa-precache-config.test.ts src/app/sw.test.ts src/app/admin`

- [ ] **Step 6: Commit only Task 1 files**

Commit: `fix(auth): isolate private browser caches`

### Task 2: Comment privacy, update contracts, and delivery lifetime

**Files:**
- Modify: `src/features/comment/application/comment-public-dto.ts`
- Modify: `src/features/comment/application/repository.ts`
- Modify: `src/features/comment/application/comment-commands.ts`
- Modify: `src/features/comment/schemas/comment.update.schema.ts`
- Modify: `src/features/comment/comment.router.ts`
- Modify: `src/features/comment/notifications/comment-delivery.ts`
- Test: corresponding comment tests

**Interfaces:**
- Produces: a single Schema-derived `CommentUpdate` that excludes target, parent, and captcha fields
- Produces: normalized `CommentRequestMetadata`

- [ ] **Step 1: Write failing public-redaction and update-contract tests**

```ts
expect(toPublicComment({ ...source, status: CommentStatus.BAN }).content).toBe("");
expect(CommentUpdateSchema.safeParse({ id, postId: otherId }).success).toBe(false);
expect(CommentUpdateSchema.safeParse({ id }).success).toBe(false);
expect(CommentUpdateSchema.safeParse({ id, status: CommentStatus.BAN }).success).toBe(true);
```

- [ ] **Step 2: Run focused tests and observe the privacy/invariant failures**

Run: `bunx vitest run src/features/comment`

- [ ] **Step 3: Implement the dedicated update contract, server-side redaction, and normalized IP injection**

```ts
export const CommentUpdateSchema = z.object({
  id: IdSchema,
  author: boundedAuthor.optional(),
  content: boundedContent.optional(),
  email: boundedEmail.optional(),
  site: optionalHttpUrl,
  status: z.enum(CommentStatus).optional(),
}).refine(({ id: _id, ...changes }) => Object.values(changes).some((value) => value !== undefined), "至少修改一个字段");
```

- [ ] **Step 4: Write a failing delivery test proving `notifyCommentCreated` settles both send attempts before resolving**

```ts
await expect(notifyPromise).not.toResolveBefore(adminSendGate);
expect(sendCommentEmail).toHaveBeenCalledTimes(2);
```

- [ ] **Step 5: Await `Promise.allSettled`, preserve non-blocking failures, and run comment tests**

Run: `bunx vitest run src/features/comment tests/comment-view-model-boundary.test.ts`

- [ ] **Step 6: Commit only Task 2 files**

Commit: `fix(comment): enforce public moderation boundaries`

### Task 3: Bounded contracts and relational integrity

**Files:**
- Modify: shared pagination/query/delete schemas and all update schemas
- Modify: category Application/repository/schema files
- Modify: post command/query repository and router
- Modify: user deletion repository/use case
- Modify: menu update schema/use case
- Create: one Drizzle migration and snapshot generated by the repository command
- Test: shared contract, category, post, user, menu, and migration tests

**Interfaces:**
- Produces: `MAX_PAGE_SIZE = 100`, `MAX_QUERY_LENGTH = 200`, `MAX_BATCH_SIZE = 100`
- Produces: database-unique category paths and post/tag/type tuples
- Produces: complete descendant category IDs

- [ ] **Step 1: Write failing shared limit and non-empty-update tests**

```ts
expect(PaginationQuerySchema.safeParse({ limit: 101 }).success).toBe(false);
expect(DeleteBatchSchema.safeParse({ ids: validIds(101) }).success).toBe(false);
expect(UpdateSchema.safeParse({ id }).success).toBe(false);
```

- [ ] **Step 2: Run the focused contract tests and confirm expected failures**

Run: `bunx vitest run tests/shared-contract-behavior.test.ts tests/write-contract-behavior.test.ts`

- [ ] **Step 3: Implement shared bounds and require at least one update field across features**

```ts
export const MAX_PAGE_SIZE = 100;
export const MAX_QUERY_LENGTH = 200;
export const MAX_BATCH_SIZE = 100;
```

- [ ] **Step 4: Write failing category tests for complete trees, grandchildren, duplicate paths, and concurrent cycle protection**

```ts
expect(await repository.categoryFilter(rootId)).toEqual([rootId, childId, grandchildId]);
expect(tree.list.map(({ id }) => id)).toEqual([rootId, childId, grandchildId]);
await expect(createDuplicatePath()).rejects.toMatchObject({ code: "BAD_REQUEST" });
```

- [ ] **Step 5: Separate tree/page reads, implement recursive descendants and transactional/constraint-backed writes**

Run: `bunx vitest run src/features/category src/features/post/tests/post-filters.test.ts src/features/post/infrastructure`

- [ ] **Step 6: Write and implement tests for tag de-duplication, protected user deletion, and empty-menu rejection**

```ts
expect(insertedTagIds).toEqual([tagA, tagB]);
await expect(deletePromotedAdmin()).rejects.toMatchObject({ code: "FORBIDDEN" });
await expect(saveAllMenus(repository, [], invalidator)).rejects.toMatchObject({ code: "BAD_REQUEST" });
```

- [ ] **Step 7: Generate and verify the migration**

Run: `bun run db:generate`

Run: `bun run db:migrations:check`

- [ ] **Step 8: Commit only Task 3 files**

Commit: `fix(data): enforce bounded relational contracts`

### Task 4: URL, media, localization, search, and accessibility correctness

**Files:**
- Create: `src/packages/application/http-url-schema.ts`
- Modify: link/comment/setting/media schemas and relevant use cases
- Modify: Post/Page query repositories
- Modify: media upload actions and media UI
- Modify: comment public components and friendly-link/footer rendering
- Test: adjacent unit/component tests and E2E accessibility coverage

**Interfaces:**
- Produces: shared HTTP(S)-only schemas
- Produces: per-file media upload result with successful and failed entries

- [ ] **Step 1: Write failing URL, search, locale-image, and media-policy tests**

```ts
expect(HttpUrlSchema.safeParse("javascript:alert(1)").success).toBe(false);
expect(descriptionOnlyWhere).not.toRequireNameMatch();
expect(imagesInContent.map(({ url }) => url)).toEqual([zhUrl, enUrl]);
expect(MediaInsertSchema.safeParse({ ...media, size: 20 * 1024 * 1024 + 1 }).success).toBe(false);
```

- [ ] **Step 2: Run focused tests and confirm each reported defect fails**

Run: `bunx vitest run src/features/link src/features/setting src/features/media src/features/post src/features/page`

- [ ] **Step 3: Implement shared URL/media policies, correct search, and collect image URLs from all locales**

```ts
export const HttpUrlSchema = z.url().refine((value) => ["http:", "https:"].includes(new URL(value).protocol));
export const MAX_MEDIA_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_MEDIA_BATCH_SIZE = 20;
```

- [ ] **Step 4: Write failing media partial-success/cleanup tests and implement settled uploads**

```ts
expect(result.state).toBe("partial");
expect(result.media).toEqual([successfulMedia]);
expect(cleanupObject).toHaveBeenCalledWith(orphanKey);
```

- [ ] **Step 5: Write failing semantic-control and empty/error-state tests, then replace clickable anchors/divs with named buttons and labels**

Run: `bunx vitest run src/features/comment/public src/features/media/shared 'src/app/(blog)/components/Footer'`

- [ ] **Step 6: Commit only Task 4 files**

Commit: `fix(ui): close media and accessibility gaps`

### Task 5: PWA artifacts, authorization governance, and full verification

**Files:**
- Modify: `src/packages/infrastructure/pwa/precache-config.ts`
- Modify: `.github/workflows/quality.yml`
- Modify: `package.json`
- Modify: authorization/type governance tests
- Modify: dashboard layout/template to remove duplicate user reads
- Test: PWA manifest, route boundaries, type-source contracts, and E2E security tests

**Interfaces:**
- Produces: `quality:spec` script running strict OpenSpec validation and diff checking
- Produces: build artifact assertion excluding admin chunks

- [ ] **Step 1: Write failing precache, admin-route, contract-source, and duplicate-auth tests**

```ts
expect(pwaGlobIgnores).toContain(".next/static/chunks/app/admin/**/*");
expect(unprotectedAdminPages).toEqual([]);
expect(singleSourceFeatures).toEqual(expect.arrayContaining(["category", "tag", "comment"]));
expect(getAdminUser).toHaveBeenCalledTimes(1);
```

- [ ] **Step 2: Run the focused governance tests and confirm failures**

Run: `bunx vitest run tests/pwa-precache-config.test.ts tests/capability-entrypoint-boundaries.test.ts tests/single-source-contracts.test.ts src/app/admin`

- [ ] **Step 3: Correct artifact excludes, strengthen structural tests, remove duplicate dashboard reads, and add CI validation commands**

```json
"quality:spec": "openspec validate --all --strict && git diff --check"
```

- [ ] **Step 4: Add E2E regressions for safe login callbacks, logout/back behavior, private cache isolation, comment redaction, nested categories, and keyboard controls**

Run: `bunx playwright test --project=chromium`

- [ ] **Step 5: Run the complete verification matrix**

Run: `bun run check-types`

Run: `bun run lint`

Run: `bun run test:unit:run`

Run: `bun run test:unit:coverage`

Run: `bun run test:unit:process`

Run: `bun run db:migrations:check`

Run: `bun run audit:production`

Run: `bun run build`

Run: `bun run quality:spec`

- [ ] **Step 6: Perform a whole-branch review and commit Task 5 files**

Commit: `test(governance): enforce hardening boundaries`
