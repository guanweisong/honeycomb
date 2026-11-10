# Remove Blog Public Query Cache Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Delete the blog `public-queries.ts` aggregation and call the tRPC server caller from the route or component that owns each public read.

**Architecture:** Remove only the app-level query wrapper, React request memoization, and Next remote query caching. Keep the existing Upstash post-list cache and sitemap cache; keep structured write invalidation for those caches and relevant routes. Request-time query consumers remain behind Suspense, and `snapshotVersion` is generated after `connection()`.

**Tech Stack:** Next.js 16.4.6 App Router with Cache Components, React Server Components, tRPC server caller, Bun, OpenSpec.

**Spec:** `openspec/changes/align-site-runtime-ownership/design.md` and `openspec/changes/align-site-runtime-ownership/specs/public-content-freshness/spec.md`.

## Global Constraints

- Use `createServerClient()` from `src/app/trpc/server.ts` at the actual blog route/component boundary.
- Keep friend-link pagination beyond `MAX_PAGE_SIZE`, existing not-found/redirect handling, and comment error fallback.
- Preserve the post-list Upstash cache version and sitemap `SITEMAP_CACHE_TAG`.
- Remove only Next query tags with no remaining cached readers; keep route revalidation and sitemap revalidation.
- Do not add dependencies or change public URLs, database schema, Service Worker behavior, or test fixtures' behavior.
- Update existing tests and mocks, but do not run test suites for this task.

## Review Focus

- Missing post/tag/author/page data still reaches the existing not-found or redirect behavior; update the affected route tests/mocks.
- Friendly-link pages still read all pages beyond the single-query limit; keep the existing pagination assertions with the route test.
- Comment query failures and framework control-flow errors retain the optional-comment fallback; update the existing comment/page mocks.
- `snapshotVersion` is generated only after request-time deferral; type and lint checks cover the moved call path.
- Cache invalidation retains Upstash version bump, sitemap tag order, and route revalidation while dropping tags with no readers; update existing invalidator assertions.

---

### Task 1: Remove direct consumers from the shared query layer

**Files:**
- Modify: `src/app/(blog)/[locale]/layout.tsx`
- Modify: `src/app/(blog)/components/Header/index.tsx`
- Modify: `src/app/(blog)/components/Footer/index.tsx`
- Modify: `src/app/(blog)/[locale]/manifest.webmanifest/route.ts`
- Modify: `src/app/(blog)/components/features/comment/public/PublicCommentSection.tsx`
- Modify: their existing adjacent tests/mocks

- [x] Read each consumer's public procedure and replace wrapper imports with direct calls through `createServerClient()`.
- [x] Keep request-time component reads in Suspense; preserve manifest `connection()` and comment error fallback.

### Task 2: Move route-owned reads into the detail and list routes

**Files:**
- Modify: `src/app/(blog)/[locale]/archives/[id]/page.tsx`
- Modify: `src/app/(blog)/[locale]/pages/[id]/page.tsx`
- Modify: `src/app/(blog)/[locale]/list/[...slug]/page.tsx`
- Modify: `src/app/(blog)/[locale]/list/[...slug]/page.utils.ts`
- Modify: their existing adjacent tests/mocks

- [x] Call the corresponding `post`, `page`, `setting`, `link`, `tag`, `user`, and `menu` procedures directly from the owning route/helper.
- [x] Preserve all-link pagination, current route parsing, NOT_FOUND mapping, and recommendation failure fallback.
- [x] Call `connection()` before creating `snapshotVersion` in `ListContent`.

### Task 3: Remove dead query-cache invalidation and documentation

**Files:**
- Modify: `src/lib/cache/public-cache-keys.ts`
- Modify: `src/lib/cache/next-public-content-invalidator.ts`
- Modify: `src/lib/cache/next-public-content-invalidator.test.ts`
- Modify: `openspec/specs/public-content-freshness/spec.md`
- Modify: `docs/public-cache-verification.md`
- Modify: `docs/code-reading-map.md`
- Modify: `.codex/skills/frontend-structure/references/nextjs.md`
- Modify: `.codex/skills/frontend-structure/references/directory-templates.md`
- Modify: `docs/type-derivation-ledger.json`

- [x] Remove public query tags with no cached readers; retain `SITEMAP_CACHE_TAG`, Upstash index version bump, and path invalidation.
- [x] Update current architecture/cache references and preserve historical migration records.

### Task 4: Delete the aggregation and check current references

**Files:**
- Delete: `src/app/(blog)/lib/server/public-queries.ts`
- Delete: `src/app/(blog)/lib/server/public-queries.test.ts`
- Modify: `openspec/changes/align-site-runtime-ownership/*`
- Modify: `openspec/changes/simplify-reading-boundaries/design.md`

- [x] Search the repository for current imports of `public-queries.ts`; only historical records may mention the old path.
- [x] Run `bun run check-types`, `bun run lint`, `bun run --bun openspec validate --all --strict`, and `git diff --check`; do not run test suites.
