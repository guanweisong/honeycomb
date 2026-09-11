# Public Cache Coherence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every public write invalidate all affected cache layers exactly once while preserving Application ownership and existing failure semantics.

**Architecture:** Replace the two-method public invalidator with a single structured invalidation plan owned by shared Application code. The Infrastructure adapter deduplicates paths and coordinates Next route cache, Upstash post-index versioning, and tagged sitemap cache expiration; Feature Use Cases declare only the scopes they affect.

**Tech Stack:** TypeScript, Zod, Next.js 16 cache APIs, Upstash Redis, Vitest, OpenSpec

**Spec:** `docs/superpowers/specs/2026-09-11-public-cache-coherence-design.md`

## Global Constraints

- Do not change public API inputs, outputs, permissions, database schema, or cache TTLs.
- Repository writes complete before synchronous invalidation; invalidation failures propagate without database rollback.
- Application must not import Next.js, tRPC, database implementations, AWS, Resend, or Upstash.
- Cache namespace, version key, sitemap tag, and Zod-derived types each have one authoritative definition.
- Work directly on the current branch as explicitly requested by the user.

---

### Task 1: Extend the OpenSpec change

**Files:**
- Modify: `openspec/changes/move-side-effects-to-application/proposal.md`
- Modify: `openspec/changes/move-side-effects-to-application/design.md`
- Modify: `openspec/changes/move-side-effects-to-application/specs/public-content-freshness/spec.md`
- Modify: `openspec/changes/move-side-effects-to-application/tasks.md`

**Interfaces:**
- Consumes: approved design in `docs/superpowers/specs/2026-09-11-public-cache-coherence-design.md`
- Produces: tasks 8.1–8.5 covering unified plans, all Feature mappings, sitemap, type ownership, and verification

- [x] **Step 1: Add the cache-coherence requirements and scenarios**

Specify that a write Use Case passes one structured plan, that dependent relation changes invalidate the post index, and that sitemap-affecting writes expire its tag immediately.

- [x] **Step 2: Add executable tasks 8.1–8.5**

Add unchecked tasks for RED tests, shared adapter implementation, Feature migration, dependency cleanup, and full verification.

- [x] **Step 3: Validate the change schema**

Run: `openspec validate move-side-effects-to-application --strict`
Expected: exit 0.

### Task 2: Define and implement unified invalidation

**Files:**
- Modify: `src/packages/application/public-content-invalidator.ts`
- Modify: `src/packages/infrastructure/refresh-path.ts`
- Modify: `src/packages/infrastructure/refresh-path.test.ts`
- Move: `src/features/post/infrastructure/post-cache-keys.ts` to `src/packages/infrastructure/cache/public-cache-keys.ts`
- Modify: `src/features/post/infrastructure/post-special-repository.ts`

**Interfaces:**
- Produces: `PublicCacheInvalidationPlan` and `PublicContentInvalidator.invalidate(plan)`
- Produces: shared `POST_CACHE_NAMESPACE`, `POST_CACHE_VERSION_KEY`, and `SITEMAP_CACHE_TAG`

- [x] **Step 1: Write failing adapter tests**

Add a case that calls:

```ts
await publicContentInvalidator.invalidate({
  contents: [
    { id: "post-1", type: "post" },
    { id: "post-1", type: "post" },
    { id: "page-1", type: "page" },
  ],
  refreshLayout: true,
  refreshPostIndex: true,
  refreshSitemap: true,
});
```

Assert each localized detail path once, layout once, `bumpCacheVersion("post.index", "cache:post:index:version")` once, and `revalidateTag(SITEMAP_CACHE_TAG, { expire: 0 })` once. Add focused cases proving omitted scopes do not run and a dependency failure rejects.

- [x] **Step 2: Run the adapter test and verify RED**

Run: `bun run test:unit:run -- src/packages/infrastructure/refresh-path.test.ts`
Expected: FAIL because `invalidate` and tagged/cache-version behavior do not exist.

- [x] **Step 3: Implement the plan schema, keys, and adapter**

Define a Zod plan schema derived from `PublicContentReferenceSchema`; parse at the adapter boundary, deduplicate `${type}:${id}`, run requested scopes once, and use `revalidateTag(SITEMAP_CACHE_TAG, { expire: 0 })`.

- [x] **Step 4: Update the post cache reader and verify GREEN**

Import the moved cache keys from the shared Infrastructure cache file, then rerun the focused adapter and post-cache tests.

### Task 3: Migrate every affected Application Use Case

**Files:**
- Modify: `src/features/{post,page,comment,category,link,tag,menu,setting,user}/application/*.ts`
- Modify: their corresponding `*.test.ts` files
- Modify: `src/features/media/application/media-use-cases.ts`
- Modify: `src/features/media/media.router*` consumers and tests as required

**Interfaces:**
- Consumes: `PublicContentInvalidator.invalidate(plan)`
- Produces: one invalidation call per successful write Use Case

- [x] **Step 1: Change Use Case tests to literal expected plans**

Use these exact scope combinations: Post `{ contents, refreshLayout: true, refreshPostIndex: true, refreshSitemap: true }`; Page `{ contents, refreshLayout: true, refreshSitemap: true }`; Menu `{ refreshLayout: true, refreshSitemap: true }`; Category/Tag/User and Media deletion `{ refreshLayout: true, refreshPostIndex: true }`; Link/Setting and comment all-content operations `{ refreshLayout: true }`; targeted comments `{ contents, refreshLayout: true }`.

- [x] **Step 2: Run affected Application tests and verify RED**

Run the Feature Application test files plus `tests/feature-repository-contracts.test.ts`.
Expected: FAIL on the old invalidator method names or missing media invalidation.

- [x] **Step 3: Implement the mappings and batch calls**

Replace all `invalidateContent`/`invalidateAll` dependencies with `Pick<PublicContentInvalidator, "invalidate">`. Batch Post/Page deletion passes all IDs in one `contents` array. Inject the invalidator into `destroyMedia` only after object deletion and record deletion succeed.

- [x] **Step 4: Update Router dependency injection and verify GREEN**

Pass `publicContentInvalidator` to media deletion and update existing test fakes. Rerun all affected Application, Router, and repository-contract tests.

### Task 4: Remove hidden side effects and reverse dependencies

**Files:**
- Modify: `src/features/post/infrastructure/post-command-repository.ts`
- Modify: `src/features/post/infrastructure/persistence-contracts.test.ts`
- Modify/Create: shared Application validation utility files
- Delete: `src/packages/trpc/api/schemas/clean.zod.ts`
- Modify: every `CleanZod` import under `src/features`
- Modify: `tests/public-cache-invalidation-boundaries.test.ts`
- Modify: `tests/feature-boundaries.test.ts` or the nearest Application import-boundary test

**Interfaces:**
- Produces: pure `PostCommandRepository` persistence operations
- Produces: `CleanZod` from the shared Application validation authority

- [x] **Step 1: Write failing boundary and repository tests**

Assert Post command create/update/destroy/updateTags never calls Upstash and that production files under `src/features/*/application` do not import `@/packages/trpc` or `@/packages/infrastructure`.

- [x] **Step 2: Run focused tests and verify RED**

Expected: FAIL because Post Repository still imports/calls `bumpCacheVersion` and user Application imports `CleanZod` from tRPC.

- [x] **Step 3: Remove repository invalidation and relocate `CleanZod`**

Delete the Post Repository cache call, move the generic type to the existing shared Application validation authority, update all consumers, and delete the old tRPC-owned file.

- [x] **Step 4: Run focused tests and verify GREEN**

Run Post persistence tests, cache-boundary tests, Feature-boundary tests, and type checking.

### Task 5: Tag sitemap caches and complete verification

**Files:**
- Modify: `src/app/sitemap-data.ts`
- Modify: sitemap tests
- Modify: `docs/architecture-dependency-report.md`
- Modify: `openspec/changes/move-side-effects-to-application/tasks.md`
- Modify: `openspec/changes/move-side-effects-to-application/verification.md`

**Interfaces:**
- Consumes: shared `SITEMAP_CACHE_TAG`
- Produces: both sitemap caches tagged with the same invalidation identity

- [x] **Step 1: Write a failing sitemap cache configuration test**

Assert both `unstable_cache` registrations receive `{ revalidate: 300, tags: [SITEMAP_CACHE_TAG] }` while retaining their existing keys.

- [x] **Step 2: Run the sitemap test and verify RED**

Expected: FAIL because the cache registrations currently have no tags.

- [x] **Step 3: Add the shared tag and update architecture documentation**

Use the shared constant in both sitemap registrations, document the unified plan and ownership boundary, and mark OpenSpec tasks complete only after their checks pass.

- [x] **Step 4: Run full verification**

Run `bun run test:unit:run`, `bun run check-types`, `bun run lint`, the project production build with its documented environment, `openspec validate move-side-effects-to-application --strict`, and `git diff --check`. Record exact results in the OpenSpec verification artifact.
